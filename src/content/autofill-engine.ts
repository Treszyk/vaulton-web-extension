export class AutofillEngine {
	fillCredentials(
		usernameInput: HTMLInputElement | null,
		passwordInput: HTMLInputElement | null,
		username: string,
		password: string,
		confirmPasswordInput?: HTMLInputElement | null,
	): void {
		if (usernameInput) {
			this.fillInput(usernameInput, username);
		}
		if (passwordInput) {
			this.fillInput(passwordInput, password);
		}
		if (confirmPasswordInput) {
			this.fillInput(confirmPasswordInput, password);
		}

		setTimeout(() => {
			if (passwordInput && passwordInput.form) {
				const submitButton = this.findSubmitButton(passwordInput.form);
				if (submitButton) {
					submitButton.focus();
				} else {
					passwordInput.focus();
				}
			} else if (passwordInput) {
				passwordInput.focus();
			} else if (usernameInput) {
				// Fallback focus if only username exists
				usernameInput.focus();
			}
		}, 100);
	}

	public fillInput(input: HTMLInputElement, value: string): void {
		const readonlyAttr = input.getAttribute('readonly');
		const disabledAttr = input.getAttribute('disabled');

		const computedStyle = window.getComputedStyle(input);
		const isHidden =
			input.offsetParent === null ||
			computedStyle.display === 'none' ||
			computedStyle.visibility === 'hidden' ||
			computedStyle.opacity === '0' ||
			computedStyle.pointerEvents === 'none';

		if (isHidden) {
			return;
		}

		if (
			input.readOnly ||
			input.disabled ||
			readonlyAttr !== null ||
			disabledAttr !== null ||
			input.matches(':read-only') ||
			input.matches(':disabled')
		) {
			return;
		}

		const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
			window.HTMLInputElement.prototype,
			'value',
		)!.set;
		nativeInputValueSetter!.call(input, value);

		const inputEvent = new Event('input', { bubbles: true });
		input.dispatchEvent(inputEvent);

		const changeEvent = new Event('change', { bubbles: true });
		input.dispatchEvent(changeEvent);

		input.classList.add('vaulton-filled');
		setTimeout(() => {
			input.classList.remove('vaulton-filled');
		}, 1000);
	}

	private findSubmitButton(form: HTMLFormElement): HTMLElement | null {
		const buttons = Array.from(
			form.querySelectorAll<HTMLElement>('button, input[type="submit"]'),
		);
		return (
			buttons.find((btn) => {
				const type = btn.getAttribute('type');
				return type === 'submit' || !type;
			}) || null
		);
	}
}
