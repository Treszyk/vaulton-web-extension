export interface LoginForm {
	usernameInput: HTMLInputElement;
	passwordInput: HTMLInputElement;
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
		});

		return this.forms;
	}

	observeForms(callback: (forms: LoginForm[]) => void): void {
		if (this.observer) {
			this.observer.disconnect();
		}

		this.observer = new MutationObserver(() => {
			const allForms = this.detectForms();
			const newForms = allForms.filter(
				(form) => !this.processedInputs.has(form.passwordInput),
			);

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
		console.log(
			'[Vaulton] setupSubmitListener called, has Form:',
			this.submitListeners.has(form),
		);
		if (this.submitListeners.has(form)) return;

		const handleSubmit = () => {
			const username = form.usernameInput.value;
			const password = form.passwordInput.value;

			if (!username || !password) {
				return;
			}

			setTimeout(() => {
				onSubmit({ username, password, form });
			}, 500);
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
			let container: HTMLElement | null = form.passwordInput.closest('div');
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
				console.log(
					'[Vaulton] Fallback: searching entire document for submit buttons',
				);
				const docButtons = document.querySelectorAll('button[type="submit"]');
				console.log(
					'[Vaulton] Found',
					docButtons.length,
					'submit buttons in document',
				);

				docButtons.forEach((btn) => {
					const buttonEl = btn as HTMLButtonElement;
					const buttonListener = () => {
						handleSubmit();
					};
					buttonEl.addEventListener('click', buttonListener, { capture: true });
				});
			}

			const handleKeydown = (e: KeyboardEvent) => {
				if (e.key === 'Enter') {
					handleSubmit();
				}
			};
			form.passwordInput.addEventListener('keydown', handleKeydown);
			this.submitListeners.set(form, handleKeydown as unknown as () => void);
		}

		this.processedInputs.add(form.passwordInput);
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

		for (let i = 0; i < candidates.length; i++) {
			const candidate = candidates[i];
			if (!candidate.offsetParent) continue;

			const isBeforePassword =
				candidate.compareDocumentPosition(passwordInput) &
				Node.DOCUMENT_POSITION_FOLLOWING;

			if (isBeforePassword) {
				return candidate;
			}
		}

		return candidates.find((c) => c.offsetParent !== null) || null;
	}
}
