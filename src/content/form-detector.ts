export interface LoginForm {
	usernameInput: HTMLInputElement;
	passwordInput: HTMLInputElement;
	formElement: HTMLFormElement | null;
}

export class FormDetector {
	private forms: LoginForm[] = [];
	private observer: MutationObserver | null = null;

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
			const forms = this.detectForms();
			if (forms.length > 0) {
				callback(forms);
			}
		});

		this.observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
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
