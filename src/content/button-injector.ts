export interface VaultonButton {
	element: HTMLElement;
	input: HTMLInputElement;
	cleanup: () => void;
}

export class ButtonInjector {
	private buttons: Map<HTMLInputElement, VaultonButton> = new Map();
	private static shadowRoot: ShadowRoot | null = null;

	private static getOverlayHost(): ShadowRoot {
		if (this.shadowRoot) return this.shadowRoot;

		const host = document.createElement('div');
		host.id = 'vaulton-overlay-host';
		host.style.cssText = `
			position: fixed !important;
			top: 0 !important;
			left: 0 !important;
			width: 0 !important;
			height: 0 !important;
			z-index: 2147483647 !important;
			pointer-events: none !important;
		`;
		document.body.appendChild(host);
		this.shadowRoot = host.attachShadow({ mode: 'open' });

		const style = document.createElement('style');
		style.textContent = `
			.vaulton-autofill-btn {
				display: none;
				position: fixed !important;
				width: 28px !important;
				height: 28px !important;
				padding: 0 !important;
				background: white !important;
				border: 1.5px solid #a855f7 !important;
				border-radius: 6px !important;
				cursor: pointer !important;
				z-index: 2147483647 !important;
				transition: border-color 0.2s, transform 0.2s !important;
				pointer-events: auto !important;
				box-sizing: border-box !important;
				box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
			}
			.vaulton-autofill-btn:hover {
				border-color: #c084fc !important;
				transform: scale(1.1) !important;
			}
			.vaulton-autofill-btn img {
				width: 100% !important;
				height: 100% !important;
				display: block !important;
				object-fit: contain !important;
				pointer-events: none !important;
			}
		`;
		this.shadowRoot.appendChild(style);

		return this.shadowRoot;
	}

	injectButton(
		input: HTMLInputElement,
		onClick: (target: HTMLInputElement) => void,
	): VaultonButton | null {
		if (input.readOnly || input.disabled) {
			return null;
		}

		if (this.buttons.has(input)) {
			return this.buttons.get(input)!;
		}

		const button = this.createButton(() => onClick(input));
		const shadow = ButtonInjector.getOverlayHost();
		shadow.appendChild(button);

		const cleanup = this.positionButton(input, button);

		const vaultonButton: VaultonButton = {
			element: button,
			input,
			cleanup: () => {
				cleanup();
				this.buttons.delete(input);
			},
		};

		this.buttons.set(input, vaultonButton);
		return vaultonButton;
	}

	removeButton(input: HTMLInputElement): void {
		const vaultonButton = this.buttons.get(input);
		if (vaultonButton) {
			vaultonButton.cleanup();
		}
	}

	removeAll(): void {
		this.buttons.forEach((button) => button.cleanup());
		this.buttons.clear();

		if (ButtonInjector.shadowRoot) {
			const styles = ButtonInjector.shadowRoot.querySelectorAll('style');
			ButtonInjector.shadowRoot.innerHTML = '';
			styles.forEach((s) => ButtonInjector.shadowRoot?.appendChild(s));
		}
	}

	private createButton(onClick: () => void): HTMLElement {
		const button = document.createElement('div');
		button.className = 'vaulton-autofill-btn';
		const iconUrl = chrome.runtime.getURL('icons/icon.png');
		button.innerHTML = `<img src="${iconUrl}" />`;

		button.addEventListener('click', (e) => {
			e.stopPropagation();
			e.preventDefault();
			onClick();
		});

		return button;
	}

	private isElementVisible(el: HTMLElement): boolean {
		if (!el.isConnected) return false;

		let current: HTMLElement | null = el;
		while (current) {
			const style = window.getComputedStyle(current);
			if (
				style.display === 'none' ||
				style.visibility === 'hidden' ||
				parseFloat(style.opacity) < 0.1
			) {
				return false;
			}
			current = current.parentElement;
		}

		if (el.offsetWidth === 0 || el.offsetHeight === 0) {
			return false;
		}

		return true;
	}

	private isObstructed(input: HTMLElement, button: HTMLElement): boolean {
		const rect = input.getBoundingClientRect();
		const x = rect.left + rect.width / 2;
		const y = rect.top + rect.height / 2;

		if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
			return true;
		}

		const elementAtPoint = document.elementFromPoint(x, y);

		if (!elementAtPoint) return true;

		if (elementAtPoint === input || input.contains(elementAtPoint))
			return false;

		if (input instanceof HTMLInputElement && input.labels) {
			for (let i = 0; i < input.labels.length; i++) {
				if (
					input.labels[i] === elementAtPoint ||
					input.labels[i].contains(elementAtPoint)
				) {
					return false;
				}
			}
		}

		if (elementAtPoint === button || button.contains(elementAtPoint))
			return false;

		return true;
	}

	private positionButton(
		input: HTMLInputElement,
		button: HTMLElement,
	): () => void {
		let lastAppliedPadding = 0;
		let isVisibleInViewport = false;
		let animationId: number | null = null;

		const initialStyle = window.getComputedStyle(input);
		const originalPaddingRight = parseFloat(initialStyle.paddingRight) || 0;

		let hasRightIcon = originalPaddingRight > 20;

		if (!hasRightIcon && input.isConnected) {
			const rect = input.getBoundingClientRect();
			if (rect.width > 40 && rect.height > 20) {
				const probeX = rect.right - 20;
				const probeY = rect.top + rect.height / 2;
				const elAtPoint = document.elementFromPoint(probeX, probeY);

				if (elAtPoint && elAtPoint !== input && !input.contains(elAtPoint)) {
					if (!elAtPoint.contains(input)) {
						hasRightIcon = true;
					}
				}
			}
		}

		const rightIconOffset = hasRightIcon
			? Math.max(originalPaddingRight, 30)
			: 0;
		const originalBoxSizing = initialStyle.boxSizing;

		const update = () => {
			if (!input.isConnected || !button.isConnected) {
				button.style.display = 'none';
				return;
			}

			if (!this.isElementVisible(input) || !isVisibleInViewport) {
				button.style.display = 'none';
				return;
			}

			if (this.isObstructed(input, button)) {
				button.style.display = 'none';
				return;
			}

			const inputRect = input.getBoundingClientRect();

			if (inputRect.width === 0 || inputRect.height === 0) {
				button.style.display = 'none';
				return;
			}

			button.style.display = 'block';

			const top = inputRect.top + inputRect.height / 2 - 14;

			const currentStyle = window.getComputedStyle(input);
			const borderRight = parseFloat(currentStyle.borderRightWidth) || 0;
			const iconWidth = 28;
			const rightMargin = 4;

			const rightOffset = rightIconOffset + iconWidth + rightMargin;

			const left = inputRect.right - borderRight - rightOffset;

			const finalLeft = Math.max(left, inputRect.left + 4);

			button.style.setProperty('top', `${top}px`, 'important');
			button.style.setProperty('left', `${finalLeft}px`, 'important');

			if (input.style.boxSizing !== 'border-box') {
				input.style.setProperty('box-sizing', 'border-box', 'important');
			}
			const targetPadding = rightIconOffset + iconWidth + rightMargin + 4;

			if (Math.abs(parseFloat(currentStyle.paddingRight) - targetPadding) > 1) {
				input.style.setProperty(
					'padding-right',
					`${targetPadding}px`,
					'important',
				);
				lastAppliedPadding = targetPadding;
			}
		};

		const loop = () => {
			if (isVisibleInViewport) {
				update();
			}
			animationId = requestAnimationFrame(loop);
		};

		const intersectionObserver = new IntersectionObserver(
			(entries) => {
				isVisibleInViewport = entries[0].isIntersecting;
				if (isVisibleInViewport) {
					update();
				} else {
					button.style.display = 'none';
				}
			},
			{
				threshold: 0,
			},
		);
		intersectionObserver.observe(input);

		animationId = requestAnimationFrame(loop);

		return () => {
			if (animationId) cancelAnimationFrame(animationId);
			intersectionObserver.disconnect();
			button.remove();
			if (lastAppliedPadding > 0) {
				input.style.removeProperty('padding-right');
			}
			if (originalBoxSizing !== 'border-box') {
				input.style.removeProperty('box-sizing');
			}
		};
	}
}
