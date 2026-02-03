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
		if (input.readOnly || input.disabled) {
			return null;
		}

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

		const zombies = document.querySelectorAll('.vaulton-autofill-btn');
		zombies.forEach((z) => z.remove());
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

		const computedPosition = window.getComputedStyle(parent).position;
		const needsRelative = computedPosition === 'static';
		if (needsRelative) {
			parent.style.position = 'relative';
		}

		parent.appendChild(button);

		let lastAppliedPadding = 0;

		const update = () => {
			if (!input.isConnected || !button.isConnected) return;

			const inputRect = input.getBoundingClientRect();
			if (inputRect.width === 0 || inputRect.height === 0) {
				button.style.display = 'none';
				return;
			}
			button.style.display = 'block';

			const scanBarrier = (
				container: HTMLElement,
				referenceRect: DOMRect,
			): number => {
				const containerRect = container.getBoundingClientRect();
				let localBarrier = containerRect.right;

				const children = Array.from(container.children);
				for (const child of children) {
					if (
						child === input ||
						child === button ||
						child === parent ||
						child.contains(input)
					)
						continue;
					if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') continue;

					const childRect = child.getBoundingClientRect();
					if (
						childRect.width === 0 ||
						childRect.height === 0 ||
						childRect.width > referenceRect.width * 0.9
					)
						continue;

					const verticalOverlap = Math.max(
						0,
						Math.min(referenceRect.bottom, childRect.bottom) -
							Math.max(referenceRect.top, childRect.top),
					);
					if (verticalOverlap < childRect.height * 0.2) continue;

					const childCenterX = childRect.left + childRect.width / 2;
					const containerCenterX = containerRect.left + containerRect.width / 2;
					if (childCenterX < containerCenterX) continue;

					if (childRect.left < localBarrier) {
						localBarrier = childRect.left;
					}
				}
				return localBarrier;
			};

			let barrierX = scanBarrier(parent, inputRect);

			if (parent.parentElement) {
				const gpBarrier = scanBarrier(parent.parentElement, inputRect);
				barrierX = Math.min(barrierX, gpBarrier);
			}

			const parentRect = parent.getBoundingClientRect();
			const distFromParentRight = parentRect.right - barrierX;

			const rightOffset = Math.max(8, distFromParentRight + 4);

			button.style.setProperty(
				'top',
				`${inputRect.top - parentRect.top + inputRect.height / 2}px`,
				'important',
			);
			button.style.setProperty('right', `${rightOffset}px`, 'important');

			const buttonLeftGlobal = parentRect.right - rightOffset - 28;
			const safepoint = buttonLeftGlobal - 4;

			const requiredPadding = Math.max(0, inputRect.right - safepoint);

			const currentComputed =
				parseFloat(window.getComputedStyle(input).paddingRight) || 0;

			if (Math.abs(currentComputed - requiredPadding) > 5) {
				input.style.setProperty(
					'padding-right',
					`${requiredPadding}px`,
					'important',
				);
				lastAppliedPadding = requiredPadding;
			}
		};

		update();

		const resizeObserver = new ResizeObserver(() => update());
		resizeObserver.observe(input);

		if (parent) resizeObserver.observe(parent);

		const mutationObserver = new MutationObserver(() => update());
		mutationObserver.observe(parent, { childList: true, subtree: false });

		return () => {
			button.remove();
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			if (lastAppliedPadding > 0) {
				input.style.removeProperty('padding-right');
			}
			if (needsRelative) {
				parent.style.position = computedPosition;
			}
		};
	}
}
