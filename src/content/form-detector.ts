export interface LoginForm {
	usernameInput: HTMLInputElement | null;
	passwordInput: HTMLInputElement | null;
	formElement: HTMLFormElement | null;
	isRegistration?: boolean;
}

export interface FormSubmitData {
	username: string;
	password: string;
	form: LoginForm;
}

export class FormDetector {
	private forms: LoginForm[] = [];
	private observer: MutationObserver | null = null;
	private submitListeners: Map<
		LoginForm,
		((e: Event) => void) | ((e: KeyboardEvent) => void)
	> = new Map();
	private processedInputs: Set<HTMLInputElement> = new Set();

	detectForms(): LoginForm[] {
		this.forms = [];
		const passwordInputs = document.querySelectorAll<HTMLInputElement>(
			'input[type="password"]',
		);

		passwordInputs.forEach((passwordInput) => {
			if (!passwordInput.offsetParent) return;

			if (this.scorePasswordInput(passwordInput) < 70) return;

			const pid = (passwordInput.id || '').toLowerCase();
			const pname = (passwordInput.name || '').toLowerCase();
			if (pid.includes('fake') || pname.includes('fake')) return;

			const usernameInput = this.findUsernameInput(passwordInput);

			const formElement = passwordInput.closest('form');
			const isRegistration = this.scoreRegistrationForm(
				passwordInput,
				formElement,
			);

			this.forms.push({
				usernameInput,
				passwordInput,
				formElement,
				isRegistration,
			});
			this.processedInputs.add(passwordInput);
			if (usernameInput) {
				this.processedInputs.add(usernameInput);
			}
		});

		this.detectStandaloneUsernames();

		return this.forms;
	}

	private scorePasswordInput(input: HTMLInputElement): number {
		let score = 100;
		const name = (input.name || '').toLowerCase();
		const id = (input.id || '').toLowerCase();
		const autocomplete = (input.autocomplete || '').toLowerCase();
		const inputMode = (input.inputMode || '').toLowerCase();
		const placeholder = (input.placeholder || '').toLowerCase();
		const maxLength = input.maxLength;

		if (autocomplete === 'one-time-code') score -= 60;

		if (maxLength > 0 && maxLength <= 6) score -= 40;

		if (inputMode === 'numeric' || inputMode === 'decimal') score -= 30;

		const negativeRegex =
			/pin|otp|code|token|verification|mfa|2fa|verification|security|auth/i;
		if (negativeRegex.test(name) || negativeRegex.test(id)) score -= 30;
		if (negativeRegex.test(placeholder)) score -= 20;

		return score;
	}

	private detectStandaloneUsernames(): void {
		const candidates = Array.from(
			document.querySelectorAll<HTMLInputElement>(
				'input[type="text"], input[type="email"], input:not([type])',
			),
		);

		candidates.forEach((input) => {
			if (this.processedInputs.has(input)) return;
			if (!input.offsetParent) return;

			const score = this.scoreCandidate(input);

			if (score >= 70) {
				const formElement = input.closest('form');
				const isRegistration = this.scoreRegistrationForm(input, formElement);

				this.forms.push({
					usernameInput: input,
					passwordInput: null,
					formElement,
					isRegistration,
				});
				this.processedInputs.add(input);
			}
		});
	}

	observeForms(callback: (forms: LoginForm[]) => void): void {
		if (this.observer) {
			this.observer.disconnect();
		}

		this.observer = new MutationObserver(() => {
			const allForms = this.detectForms();
			const newForms = allForms.filter((form) => {
				return !this.submitListeners.has(form);
			});

			if (newForms.length > 0) {
				callback(newForms);
			}
		});

		this.observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	setupSubmitListener(
		form: LoginForm,
		onSubmit: (data: FormSubmitData) => void,
	): void {
		if (this.submitListeners.has(form)) return;

		let isSubmitting = false;
		const handleSubmit = () => {
			if (isSubmitting) return;
			isSubmitting = true;
			setTimeout(() => {
				isSubmitting = false;
			}, 1000);

			const username = form.usernameInput ? form.usernameInput.value : '';
			const password = form.passwordInput ? form.passwordInput.value : '';

			const safeUsername = username || 'unknown';

			onSubmit({ username: safeUsername, password, form });
		};

		if (form.formElement) {
			const listener = () => {
				handleSubmit();
			};
			form.formElement.addEventListener('submit', listener, { capture: true });

			const submitButtons = form.formElement.querySelectorAll(
				'button[type="submit"], button:not([type]), input[type="submit"]',
			);

			submitButtons.forEach((btn) => {
				const buttonEl = btn as HTMLButtonElement | HTMLInputElement;

				const buttonListener = () => {
					handleSubmit();
				};
				buttonEl.addEventListener('click', buttonListener, { capture: true });
			});

			this.submitListeners.set(form, listener);
		} else {
			const anchorInput = form.passwordInput || form.usernameInput;
			if (!anchorInput) return;
			let container: HTMLElement | null = anchorInput.closest('div');
			let searchDepth = 0;
			const maxDepth = 5;
			let buttonsFound = 0;

			while (container && searchDepth < maxDepth && buttonsFound === 0) {
				const buttons = container.querySelectorAll(
					'button[type="submit"], input[type="submit"]',
				);

				if (buttons.length > 0) {
					buttons.forEach((btn) => {
						const buttonEl = btn as HTMLButtonElement | HTMLInputElement;

						const buttonListener = () => {
							handleSubmit();
						};
						buttonEl.addEventListener('click', buttonListener, {
							capture: true,
						});
					});
					buttonsFound = buttons.length;
				}

				container = container.parentElement;
				searchDepth++;
			}

			if (buttonsFound === 0) {
				const docButtons = document.querySelectorAll('button[type="submit"]');
				docButtons.forEach((btn) => {
					const buttonEl = btn as HTMLButtonElement;
					const buttonListener = () => {
						handleSubmit();
					};
					buttonEl.addEventListener('click', buttonListener, { capture: true });
				});
			}

			if (form.passwordInput) {
				const handleKeydown = (e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						handleSubmit();
					}
				};
				form.passwordInput.addEventListener('keydown', handleKeydown);
				this.submitListeners.set(form, handleKeydown as unknown as () => void);
			} else if (form.usernameInput) {
				const handleKeydown = (e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						handleSubmit();
					}
				};
				form.usernameInput.addEventListener('keydown', handleKeydown);
				this.submitListeners.set(form, handleKeydown as unknown as () => void);
			}
		}

		if (form.passwordInput) this.processedInputs.add(form.passwordInput);
		if (form.usernameInput) this.processedInputs.add(form.usernameInput);
	}

	disconnect(): void {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
	}

	private findUsernameInput(
		passwordInput: HTMLInputElement,
	): HTMLInputElement | null {
		const form = passwordInput.closest('form');
		const searchRoot = form || document.body;

		const candidates = Array.from(
			searchRoot.querySelectorAll<HTMLInputElement>(
				'input[type="text"], input[type="email"], input:not([type])',
			),
		);

		const validCandidates = candidates.filter(
			(c) =>
				c.offsetParent !== null &&
				c.compareDocumentPosition(passwordInput) &
					Node.DOCUMENT_POSITION_FOLLOWING,
		);

		let bestCandidate: HTMLInputElement | null = null;
		let maxScore = -1;

		for (const candidate of validCandidates) {
			const score = this.scoreCandidate(candidate);
			if (score >= maxScore) {
				maxScore = score;
				bestCandidate = candidate;
			}
		}

		if (maxScore < 1) return null;

		return bestCandidate;
	}

	private scoreCandidate(input: HTMLInputElement): number {
		let score = 0;
		const name = (input.name || '').toLowerCase();
		const id = (input.id || '').toLowerCase();
		const autocomplete = (input.autocomplete || '').toLowerCase();
		const type = (input.type || '').toLowerCase();
		const placeholder = (input.placeholder || '').toLowerCase();

		if (autocomplete === 'username' || autocomplete === 'email') return 100;

		if (type === 'email') score += 20;

		const positiveRegex =
			/^(user|login|email|account|id|u|phone|mobile)$|.*(user|login|email|account).*/;
		if (positiveRegex.test(name)) score += 15;
		if (positiveRegex.test(id)) score += 15;
		if (positiveRegex.test(placeholder)) score += 10;

		const negativeRegex =
			/search|query|title|subject|date|year|age|captcha|otp|code|promo|coupon|subscribe|pin|verification|token/;

		if (negativeRegex.test(name)) score -= 50;
		if (negativeRegex.test(id)) score -= 50;
		if (negativeRegex.test(placeholder)) score -= 30;

		if (name.includes('fake') || id.includes('fake')) score -= 100;

		return score;
	}

	private scoreRegistrationForm(
		input: HTMLInputElement,
		form: HTMLFormElement | null,
	): boolean {
		const autocomplete = (input.autocomplete || '').toLowerCase();
		if (autocomplete === 'new-password') return true;

		const id = (input.id || '').toLowerCase();
		const name = (input.name || '').toLowerCase();
		const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
		const placeholder = (input.placeholder || '').toLowerCase();

		const regKeywords = ['register', 'signup', 'create', 'new', 'join'];
		const isMatch = (str: string) => regKeywords.some((kw) => str.includes(kw));

		if (
			isMatch(id) ||
			isMatch(name) ||
			isMatch(ariaLabel) ||
			isMatch(placeholder)
		) {
			return true;
		}

		if (form) {
			const pwInputs = form.querySelectorAll('input[type="password"]');
			if (pwInputs.length >= 2) return true;

			const formId = (form.id || '').toLowerCase();
			const formName = (form.name || '').toLowerCase();
			const formAction = (form.getAttribute('action') || '').toLowerCase();

			if (isMatch(formId) || isMatch(formName) || isMatch(formAction)) {
				return true;
			}
		}

		return false;
	}
}
