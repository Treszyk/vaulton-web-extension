import { FormDetector, LoginForm, FormSubmitData } from './form-detector';
import { ButtonInjector } from './button-injector';
import { CredentialPicker, CredentialOption } from './credential-picker';
import { AutofillEngine } from './autofill-engine';
import { browserApi } from '../core/storage/storage-core';
import { SavePrompt } from './save-prompt';
import { getBaseDomain } from './domain-utils';
import { generateSecurePassword } from '../core/crypto/password-utils';

console.log('[Vaulton] Content script initialized');

const formDetector = new FormDetector();
const buttonInjector = new ButtonInjector();
const credentialPicker = new CredentialPicker();
const autofillEngine = new AutofillEngine();
const savePrompt = new SavePrompt();

function extractDomain(url: string): string {
	try {
		const urlObj = new URL(url);
		return urlObj.hostname;
	} catch {
		return '';
	}
}

async function fetchCredentials(
	domain: string,
): Promise<{ credentials: CredentialOption[]; locked: boolean }> {
	try {
		const response = await browserApi.runtime.sendMessage({
			type: 'GET_CREDENTIALS',
			payload: { domain },
		});

		if (response && response.success && response.data) {
			return response.data;
		}
		return { credentials: [], locked: false };
	} catch (e) {
		console.error('[Vaulton] Failed to fetch credentials:', e);
		return { credentials: [], locked: false };
	}
}

async function fetchAllCredentials(): Promise<{
	credentials: CredentialOption[];
	locked: boolean;
}> {
	try {
		const response = await browserApi.runtime.sendMessage({
			type: 'GET_CREDENTIALS',
			payload: { domain: '' },
		});

		if (response && response.success && response.data) {
			return response.data;
		}
		return { credentials: [], locked: false };
	} catch (e) {
		console.error('[Vaulton] Failed to fetch all credentials:', e);
		return { credentials: [], locked: false };
	}
}

async function handleButtonClick(
	form: LoginForm,
	targetInput: HTMLInputElement,
): Promise<void> {
	const domain = extractDomain(window.location.href);
	const response = await fetchCredentials(domain);

	if (response.locked) {
		credentialPicker.showLockedState(targetInput);
		return;
	}

	const handleSelect = (cred: CredentialOption) => {
		autofillEngine.fillCredentials(
			form.usernameInput,
			form.passwordInput,
			cred.username,
			cred.password,
		);
	};

	const handleGenerate = () => {
		const target = form.passwordInput || targetInput;

		if (
			target.readOnly ||
			target.disabled ||
			target.getAttribute('readonly') !== null ||
			target.getAttribute('disabled') !== null
		) {
			return;
		}

		const newPassword = generateSecurePassword(20);
		target.value = newPassword;
		target.dispatchEvent(new Event('input', { bubbles: true }));
		target.dispatchEvent(new Event('change', { bubbles: true }));
	};

	const handleShowAll = async () => {
		const allResponse = await fetchAllCredentials();
		if (allResponse.locked) {
			credentialPicker.showLockedState(targetInput);
			return;
		}

		credentialPicker.show(
			allResponse.credentials,
			targetInput,
			handleSelect,
			handleGenerate,
			undefined,
			undefined,
			form.isRegistration,
		);
	};

	credentialPicker.show(
		response.credentials,
		targetInput,
		handleSelect,
		handleGenerate,
		handleShowAll,
		domain,
		form.isRegistration,
	);
}

function setupForm(form: LoginForm): void {
	if (form.usernameInput) {
		buttonInjector.injectButton(form.usernameInput, (target) =>
			handleButtonClick(form, target),
		);
	}
	if (form.passwordInput) {
		buttonInjector.injectButton(form.passwordInput, (target) =>
			handleButtonClick(form, target),
		);
	}

	formDetector.setupSubmitListener(form, handleFormSubmit);
}

async function handleFormSubmit(data: FormSubmitData): Promise<void> {
	console.log('[Vaulton] handleFormSubmit triggered');
	const currentUrl = window.location.href;
	const baseDomain = getBaseDomain(currentUrl);

	if (!baseDomain) {
		console.warn('[Vaulton] No base domain found for URL:', currentUrl);
		return;
	}

	try {
		console.log(
			'[Vaulton] Notifying background of pending save for:',
			baseDomain,
		);
		await browserApi.runtime.sendMessage({
			type: 'SET_PENDING_SAVE',
			payload: {
				domain: baseDomain,
				username: data.username,
				password: data.password,
				action: 'save',
			},
		});

		const response = await browserApi.runtime.sendMessage({
			type: 'CHECK_CREDENTIAL_EXISTS',
			payload: {
				domain: baseDomain,
				username: data.username,
				password: data.password,
			},
		});

		console.log('[Vaulton] CHECK_CREDENTIAL_EXISTS response:', response);

		if (response && response.success && response.data) {
			const { action } = response.data;

			if (action === 'ignore') {
				console.log(
					'[Vaulton] Credential already exists, skipping save prompt.',
				);
				await browserApi.runtime.sendMessage({
					type: 'CLEAR_PENDING_SAVE',
					payload: { domain: baseDomain },
				});
				return;
			}

			if (action === 'update') {
				await browserApi.runtime.sendMessage({
					type: 'SET_PENDING_SAVE',
					payload: {
						domain: baseDomain,
						username: data.username,
						password: data.password,
						action: 'update',
					},
				});
			}

			savePrompt.show(action, baseDomain, data.username, async (userAction) => {
				console.log('[Vaulton] Save prompt action:', userAction);
				await browserApi.runtime.sendMessage({
					type: 'CLEAR_PENDING_SAVE',
					payload: { domain: baseDomain },
				});

				if (userAction === 'save' || userAction === 'update') {
					try {
						await browserApi.runtime.sendMessage({
							type: 'SAVE_CREDENTIAL',
							payload: {
								domain: baseDomain,
								username: data.username,
								password: data.password,
							},
						});
					} catch (e) {
						console.error('[Vaulton] Failed to save credential:', e);
					}
				}
			});
		}
	} catch (e) {
		console.error('[Vaulton] Form submit handler error:', e);
	}
}

async function initialize(): Promise<void> {
	console.log('[Vaulton] initialize() called');

	buttonInjector.removeAll();

	const currentUrl = window.location.href;
	const baseDomain = getBaseDomain(currentUrl);
	console.log('[Vaulton] Checking pending saves for domain:', baseDomain);

	if (baseDomain) {
		const pendingResult = await browserApi.runtime.sendMessage({
			type: 'GET_PENDING_SAVE',
			payload: { domain: baseDomain },
		});

		console.log('[Vaulton] GET_PENDING_SAVE response:', pendingResult);

		if (pendingResult && pendingResult.success && pendingResult.data) {
			const pending = pendingResult.data;
			console.log('[Vaulton] Recovered pending save:', pending.username);
			savePrompt.show(
				pending.action,
				pending.domain,
				pending.username,
				async (userAction) => {
					await browserApi.runtime.sendMessage({
						type: 'CLEAR_PENDING_SAVE',
						payload: { domain: baseDomain },
					});

					if (userAction === 'save' || userAction === 'update') {
						await browserApi.runtime.sendMessage({
							type: 'SAVE_CREDENTIAL',
							payload: {
								domain: pending.domain,
								username: pending.username,
								password: pending.password,
							},
						});
					}
				},
			);
		} else {
			console.log('[Vaulton] No pending saves found.');
		}
	}

	const forms = formDetector.detectForms();
	console.log('[Vaulton] About to setup', forms.length, 'forms');

	forms.forEach((form, index) => {
		try {
			console.log(`[Vaulton] Setting up form ${index + 1}/${forms.length}`);
			setupForm(form);
		} catch (e) {
			console.error('[Vaulton] Error setting up form:', e);
		}
	});

	formDetector.observeForms((newForms) => {
		newForms.forEach(setupForm);
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initialize);
} else {
	initialize();
}
