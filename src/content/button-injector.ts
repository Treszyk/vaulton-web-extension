import { resetAutoLockTimer } from './activity-tracker';

export interface VaultonButton {
	element: HTMLElement;
	input: HTMLInputElement;
	cleanup: () => void;
}

export class ButtonInjector {
	private buttons: Map<HTMLInputElement, VaultonButton> = new Map();

	injectButton(
		input: HTMLInputElement,
		onClick: (target: HTMLInputElement) => void,
	): VaultonButton | null {
		if (this.buttons.has(input)) {
			return this.buttons.get(input)!;
		}

		const button = this.createButton(() => onClick(input));
		const cleanup = this.positionButton(input, button);

		if (!cleanup) {
			button.remove();
			return null;
		}

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
	}

	private createButton(onClick: () => void): HTMLElement {
		const button = document.createElement('div');
		button.className = 'vaulton-autofill-btn';
		const iconUrl = chrome.runtime.getURL('icons/icon.png');
		button.innerHTML = `<img src="${iconUrl}" style="width: 100% !important; height: 100% !important; display: block !important; object-fit: contain !important; pointer-events: none !important;" />`;

		button.style.cssText = `
			display: block !important;
			position: absolute !important;
			top: 50% !important;
			transform: translateY(-50%) !important;
			width: 28px !important;
			height: 28px !important;
			padding: 0 !important;
			background: transparent !important;
			border: 2px solid #a855f7 !important;
			border-radius: 6px !important;
			cursor: pointer !important;
			z-index: 99999 !important;
			transition: all 0.2s !important;
			pointer-events: auto !important;
			opacity: 1 !important;
			box-sizing: border-box !important;
		`;

		button.addEventListener('click', (e) => {
			e.stopPropagation();
			e.preventDefault();
			resetAutoLockTimer();
			onClick();
		});

		button.addEventListener('mouseenter', () => {
			button.style.setProperty('border-color', '#c084fc', 'important');
			button.style.setProperty(
				'transform',
				'translateY(-50%) scale(1.1)',
				'important',
			);
		});

		button.addEventListener('mouseleave', () => {
			button.style.setProperty('border-color', '#a855f7', 'important');
			button.style.setProperty(
				'transform',
				'translateY(-50%) scale(1)',
				'important',
			);
		});

		const style = document.createElement('style');
		style.textContent = `
			@keyframes vaultonFadeIn {
				from { opacity: 0; }
				to { opacity: 1; }
			}
		`;
		document.head.appendChild(style);

		return button;
	}

	private positionButton(
		input: HTMLInputElement,
		button: HTMLElement,
	): (() => void) | null {
		const parent = input.parentElement;
		if (!parent) return null;

		const originalPadding = window.getComputedStyle(input).paddingRight;
		const paddingValue = parseInt(originalPadding) || 0;

		// If there is already padding, it likely means there is an icon (like a password eye).
		// We place our icon to the left of whatever is already there.
		const rightOffset = paddingValue > 0 ? paddingValue + 4 : 8;
		button.style.setProperty('right', `${rightOffset}px`, 'important');

		// Add space for our 28px icon + some margin
		input.style.setProperty(
			'padding-right',
			`${paddingValue + 36}px`,
			'important',
		);

		const computedPosition = window.getComputedStyle(parent).position;
		const needsRelative = computedPosition === 'static';
		if (needsRelative) {
			parent.style.position = 'relative';
		}

		parent.appendChild(button);

		const resizeObserver = new ResizeObserver(() => {
			const rect = input.getBoundingClientRect();
			const parentRect = parent.getBoundingClientRect();
			button.style.setProperty(
				'top',
				`${rect.top - parentRect.top + rect.height / 2}px`,
				'important',
			);
		});
		resizeObserver.observe(input);

		return () => {
			button.remove();
			input.style.paddingRight = originalPadding;
			if (needsRelative) {
				parent.style.position = computedPosition;
			}
			resizeObserver.disconnect();
		};
	}
}
