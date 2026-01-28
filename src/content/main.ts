import { FormDetector, LoginForm, FormSubmitData } from './form-detector';
import { ButtonInjector } from './button-injector';
import { CredentialPicker, CredentialOption } from './credential-picker';
import { AutofillEngine } from './autofill-engine';
import { browserApi } from '../core/storage/storage-core';
import { SavePrompt } from './save-prompt';
import { getBaseDomain } from './domain-utils';

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

	const handleShowAll = async () => {
		const allResponse = await fetchAllCredentials();
		if (allResponse.locked) {
			credentialPicker.showLockedState(targetInput);
			return;
		}

		credentialPicker.show(
			allResponse.credentials,
			targetInput,
			(cred) => {
				autofillEngine.fillCredentials(
					form.usernameInput,
					form.passwordInput,
					cred.username,
					cred.password,
				);
			},
			undefined,
			undefined,
		);
	};

	credentialPicker.show(
		response.credentials,
		targetInput,
		(cred) => {
			autofillEngine.fillCredentials(
				form.usernameInput,
				form.passwordInput,
				cred.username,
				cred.password,
			);
		},
		handleShowAll,
		domain,
	);
}

function setupForm(form: LoginForm): void {
	buttonInjector.injectButton(form.usernameInput, (target) =>
		handleButtonClick(form, target),
	);
	buttonInjector.injectButton(form.passwordInput, (target) =>
		handleButtonClick(form, target),
	);

	formDetector.setupSubmitListener(form, handleFormSubmit);
}

async function handleFormSubmit(data: FormSubmitData): Promise<void> {
	const currentUrl = window.location.href;
	const baseDomain = getBaseDomain(currentUrl);

	if (!baseDomain) return;

	try {
		const response = await browserApi.runtime.sendMessage({
			type: 'CHECK_CREDENTIAL_EXISTS',
			payload: {
				domain: baseDomain,
				username: data.username,
				password: data.password,
			},
		});

		if (response && response.success && response.data) {
			const { action } = response.data;

			if (action === 'ignore') {
				return;
			}

			savePrompt.show(
				action === 'save' ? 'save' : 'update',
				baseDomain,
				data.username,
				async (userAction) => {
					if (userAction === 'never') {
						return;
					}

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
				},
			);
		}
	} catch (e) {
		console.error('[Vaulton] Form submit handler error:', e);
	}
}

function initialize(): void {
	console.log('[Vaulton] initialize() called');
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
