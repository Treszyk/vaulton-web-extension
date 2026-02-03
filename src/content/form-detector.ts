export interface LoginForm {
	usernameInput: HTMLInputElement;
	passwordInput: HTMLInputElement | null;
	formElement: HTMLFormElement | null;
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

			const usernameInput = this.findUsernameInput(passwordInput);
			if (!usernameInput) return;

			const formElement = passwordInput.closest('form');
			this.forms.push({
				usernameInput,
				passwordInput,
				formElement,
			});
			this.processedInputs.add(passwordInput);
			this.processedInputs.add(usernameInput);
		});

		this.detectStandaloneUsernames();

		return this.forms;
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
				this.forms.push({
					usernameInput: input,
					passwordInput: null,
					formElement,
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

			const username = form.usernameInput.value;
			const password = form.passwordInput ? form.passwordInput.value : '';

			if (!username) {
				return;
			}

			onSubmit({ username, password, form });
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
			} else {
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
		this.processedInputs.add(form.usernameInput);
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
			if (score > maxScore) {
				maxScore = score;
				bestCandidate = candidate;
			}
		}

		if (maxScore < 0) return null;

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
			/search|query|title|subject|date|year|age|captcha|otp|code|promo|coupon|subscribe/;

		if (negativeRegex.test(name)) score -= 50;
		if (negativeRegex.test(id)) score -= 50;
		if (negativeRegex.test(placeholder)) score -= 30;

		return score;
	}
}
