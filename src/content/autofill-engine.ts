export class AutofillEngine {
	fillCredentials(
		usernameInput: HTMLInputElement,
		passwordInput: HTMLInputElement,
		username: string,
		password: string,
	): void {
		this.fillInput(usernameInput, username);
		this.fillInput(passwordInput, password);

		setTimeout(() => {
			if (passwordInput.form) {
				const submitButton = this.findSubmitButton(passwordInput.form);
				if (submitButton) {
					submitButton.focus();
				} else {
					passwordInput.focus();
				}
			} else {
				passwordInput.focus();
			}
		}, 100);
	}

	private fillInput(input: HTMLInputElement, value: string): void {
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
