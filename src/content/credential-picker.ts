import { escapeHtml } from './dom-utils';
import { OverlayManager } from './overlay-manager';

export interface CredentialOption {
	id: string;
	title: string;
	username: string;
	password: string;
	website: string;
}

export class CredentialPicker {
	private element: HTMLElement | null = null;
	private repositionListener: (() => void) | null = null;
	private intersectionObserver: IntersectionObserver | null = null;
	private initialSide: 'top' | 'bottom' = 'bottom';
	private initialMaxHeight: number = 420;

	show(
		credentials: CredentialOption[],
		targetInput: HTMLInputElement,
		onSelect: (cred: CredentialOption) => void,
		onGenerate: () => void,
		onShowAll?: () => void,
		domain?: string,
		isRegistration?: boolean,
	): void {
		this.hide();

		const picker = this.createPicker(
			credentials,
			onSelect,
			onGenerate,
			onShowAll,
			domain,
			isRegistration,
			targetInput,
		);
		const shadow = OverlayManager.getShadowRoot();
		shadow.appendChild(picker);
		this.element = picker;

		this.determineInitialPosition(targetInput);
		this.setupStickyListeners(picker, targetInput);
		this.positionPicker(picker, targetInput);

		const handleOutsideClick = (e: MouseEvent) => {
			if (!e.composedPath().includes(picker)) {
				this.hide();
				window.removeEventListener('click', handleOutsideClick, {
					capture: true,
				});
			}
		};

		setTimeout(() => {
			window.addEventListener('click', handleOutsideClick, { capture: true });
		}, 100);
	}

	hide(): void {
		if (this.repositionListener) {
			window.removeEventListener('scroll', this.repositionListener, {
				capture: true,
			});
			window.removeEventListener('resize', this.repositionListener, {
				capture: true,
			});
			this.repositionListener = null;
		}

		if (this.intersectionObserver) {
			this.intersectionObserver.disconnect();
			this.intersectionObserver = null;
		}

		const el = this.element;
		if (el) {
			this.element = null;
			el.style.setProperty(
				'animation',
				'vaultonPickerSlideOut 0.2s ease-in forwards',
				'important',
			);
			el.addEventListener('animationend', () => el.remove(), { once: true });
			setTimeout(() => el.remove(), 250);
		}
	}

	showLockedState(targetInput: HTMLInputElement): void {
		this.hide();

		const picker = document.createElement('div');
		picker.className = 'vaulton-credential-picker';
		picker.style.cssText = `
			position: absolute !important;
			background: #18181b !important;
			border: 1px solid #27272a !important;
			border-radius: 12px !important;
			padding: 16px !important;
			margin: 0 !important;
			box-sizing: border-box !important;
			z-index: 999999 !important;
			box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
			font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
			animation: vaultonPickerSlideIn 0.2s ease-out !important;
			display: flex !important;
			flex-direction: column !important;
			color: white !important;
			text-align: center !important;
		`;

		picker.innerHTML = `
			<div style="display: flex !important; justify-content: center !important; margin-bottom: 12px; color: #a855f7;">
				<svg style="width: 32px; height: 32px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
					<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
				</svg>
			</div>
			<div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">Vault is Locked</div>
			<div style="font-size: 13px; color: #d4d4d8; margin-bottom: 16px;">Please log in to the Vaulton extension to access your credentials.</div>
		`;

		const loginNote = document.createElement('div');
		loginNote.style.cssText = `
			font-size: 11px;
			color: #a1a1aa;
			background: #27272a;
			padding: 8px;
			border-radius: 6px;
		`;
		loginNote.textContent =
			'Tip: Click the Vaulton icon in your browser toolbar to unlock.';
		picker.appendChild(loginNote);

		const shadow = OverlayManager.getShadowRoot();
		shadow.appendChild(picker);
		this.element = picker;

		this.determineInitialPosition(targetInput);
		this.setupStickyListeners(picker, targetInput);
		this.positionPicker(picker, targetInput);

		const handleOutsideClick = (e: MouseEvent) => {
			if (!e.composedPath().includes(picker)) {
				this.hide();
				window.removeEventListener('click', handleOutsideClick, {
					capture: true,
				});
			}
		};

		setTimeout(() => {
			window.addEventListener('click', handleOutsideClick, { capture: true });
		}, 100);
	}

	showInvalidatedState(targetInput: HTMLInputElement): void {
		this.hide();

		const picker = document.createElement('div');
		picker.className = 'vaulton-credential-picker';
		picker.style.cssText = `
			position: absolute !important;
			background: #18181b !important;
			border: 1px solid #27272a !important;
			border-radius: 12px !important;
			padding: 16px !important;
			margin: 0 !important;
			box-sizing: border-box !important;
			z-index: 999999 !important;
			box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
			font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
			animation: vaultonPickerSlideIn 0.2s ease-out !important;
			display: flex !important;
			flex-direction: column !important;
			color: white !important;
			text-align: center !important;
		`;

		picker.innerHTML = `
			<div style="display: flex !important; justify-content: center !important; margin-bottom: 12px; color: #a1a1aa;">
				<svg style="width: 32px; height: 32px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
					<line x1="12" y1="2" x2="12" y2="12"></line>
				</svg>
			</div>
			<div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">Connection Lost</div>
			<div style="font-size: 13px; color: #d4d4d8; margin-bottom: 16px;">The extension has been updated or reloaded. Please refresh to continue.</div>
		`;

		const refreshBtn = document.createElement('button');
		refreshBtn.style.cssText = `
			background: #7c3aed;
			color: white;
			border: none;
			border-radius: 8px;
			padding: 8px 16px;
			font-size: 13px;
			font-weight: 600;
			cursor: pointer;
			transition: background 0.2s;
		`;
		refreshBtn.textContent = 'Refresh Page';
		refreshBtn.onclick = () => window.location.reload();
		picker.appendChild(refreshBtn);

		const shadow = OverlayManager.getShadowRoot();
		shadow.appendChild(picker);
		this.element = picker;

		this.determineInitialPosition(targetInput);
		this.setupStickyListeners(picker, targetInput);
		this.positionPicker(picker, targetInput);

		const handleOutsideClick = (e: MouseEvent) => {
			if (!e.composedPath().includes(picker)) {
				this.hide();
				window.removeEventListener('click', handleOutsideClick, {
					capture: true,
				});
			}
		};

		setTimeout(() => {
			window.addEventListener('click', handleOutsideClick, { capture: true });
		}, 100);
	}

	private createPicker(
		credentials: CredentialOption[],
		onSelect: (cred: CredentialOption) => void,
		onGenerate: () => void,
		onShowAll?: () => void,
		domain?: string,
		isRegistration?: boolean,
		targetInput?: HTMLInputElement,
	): HTMLElement {
		const picker = document.createElement('div');
		picker.className = 'vaulton-credential-picker';
		picker.style.cssText = `
			position: absolute !important;
			background: #18181b !important;
			border: 1px solid #27272a !important;
			border-radius: 12px !important;
			padding: 0 !important;
			margin: 0 !important;
			box-sizing: border-box !important;
			min-width: 0 !important;
			max-height: 420px !important;
			z-index: 999999 !important;
			box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
			font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
			animation: vaultonPickerSlideIn 0.2s ease-out !important;
			display: flex !important;
			flex-direction: column !important;
		`;

		if (domain && onShowAll && targetInput) {
			const header = this.createHeader(
				domain,
				credentials.length,
				onShowAll,
				targetInput,
			);
			picker.appendChild(header);
		}

		const listContainer = document.createElement('div');
		listContainer.style.cssText = `
			padding: 8px;
			overflow-y: auto;
			overflow-x: hidden;
			flex: 1;
			min-height: 0;
			max-height: 320px !important;
		`;

		const genItem = this.createGenerationItem(onGenerate, isRegistration);

		if (isRegistration) {
			listContainer.appendChild(genItem);
			if (credentials.length > 0) {
				const separator = document.createElement('div');
				separator.style.cssText = `
					height: 1px;
					background: #27272a;
					margin: 8px 12px;
				`;
				listContainer.appendChild(separator);
			}
		}

		if (credentials.length === 0 && !isRegistration) {
			listContainer.innerHTML = `
				<div style="padding: 16px; text-align: center; color: #d4d4d8; font-size: 13px;">
					No credentials found${domain ? ` for <strong>${escapeHtml(domain)}</strong>` : ''}
				</div>
			`;
		} else {
			credentials.forEach((cred) => {
				const item = this.createCredentialItem(cred, onSelect);
				listContainer.appendChild(item);
			});
		}

		if (!isRegistration) {
			const separator = document.createElement('div');
			separator.style.cssText = `
				height: 1px;
				background: #27272a;
				margin: 8px 12px;
			`;
			listContainer.appendChild(separator);
			listContainer.appendChild(genItem);
		}

		picker.appendChild(listContainer);

		return picker;
	}

	private createHeader(
		domain: string,
		count: number,
		onShowAll: () => void,
		targetInput: HTMLInputElement,
	): HTMLElement {
		const header = document.createElement('div');
		header.style.cssText = `
			padding: 12px 12px 8px 12px;
			border-bottom: 1px solid #27272a;
			display: flex;
			justify-content: space-between;
			align-items: center;
		`;
		header.className = 'vaulton-header';

		header.innerHTML = `
			<div style="flex: 1;">
				<div style="color: #d4d4d8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
					Credentials for
				</div>
				<div style="color: white; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
					${escapeHtml(domain)} ${count > 0 ? `(${count})` : ''}
				</div>
			</div>
		`;

		const style = document.createElement('style');
		style.textContent = `
			.vaulton-btn {
				box-sizing: border-box;
				padding: 0 12px;
				height: 28px;
				border-radius: 8px;
				font-family: 'Inter', system-ui, sans-serif;
				font-size: 11px;
				font-weight: 600;
				text-transform: uppercase;
				letter-spacing: 0.05em;
				cursor: pointer;
				transition: all 0.2s;
				display: flex;
				align-items: center;
				justify-content: center;
				white-space: nowrap;
				font-variant-numeric: tabular-nums;
				border-width: 1px;
				border-style: solid;
			}
			.vaulton-btn-secondary {
				background: transparent;
				color: #e4e4e7;
				border-color: #3f3f46;
			}
			.vaulton-btn-secondary:hover {
				background: rgba(255, 255, 255, 0.05);
				border-color: #52525b;
			}
			.vaulton-btn-primary {
				background: #7c3aed;
				color: white;
				border-color: #7c3aed;
			}
			.vaulton-btn-primary:hover {
				background: #8b5cf6;
				border-color: #8b5cf6;
			}
			.vaulton-btn-reveal {
				min-width: 80px;
			}
			.vaulton-credential-picker[data-vaulton-narrow="true"] .vaulton-header {
				flex-direction: column;
				align-items: stretch;
				gap: 12px;
			}
			.vaulton-credential-picker[data-vaulton-narrow="true"] .vaulton-header-tools {
				flex-direction: column;
				align-items: stretch;
				width: 100%;
			}
			.vaulton-credential-picker[data-vaulton-narrow="true"] .vaulton-btn {
				width: 100%;
			}
		`;
		header.appendChild(style);

		const toolsContainer = document.createElement('div');
		toolsContainer.className = 'vaulton-header-tools';
		toolsContainer.style.cssText = `
			display: flex;
			align-items: center;
			gap: 8px;
		`;

		const revealBtn = document.createElement('button');
		revealBtn.type = 'button';
		revealBtn.className =
			'vaulton-btn vaulton-btn-secondary vaulton-btn-reveal';

		const REVEAL_DURATION_MS = 15000;
		let countdownInterval: number | null = null;

		const clearTimer = () => {
			if (countdownInterval) {
				clearInterval(countdownInterval);
				countdownInterval = null;
			}
		};

		const updateState = () => {
			const expiresAttr = targetInput.dataset.vaultonRevealExpires;
			const now = Date.now();

			if (expiresAttr) {
				const expires = parseInt(expiresAttr, 10);
				if (expires > now) {
					const msLeft = expires - now;
					const secondsLeft = Math.ceil(msLeft / 1000);

					if (targetInput.type !== 'text') {
						targetInput.type = 'text';
					}

					revealBtn.textContent = `HIDE (${secondsLeft}s)`;
					revealBtn.classList.remove('vaulton-btn-secondary');
					revealBtn.classList.add('vaulton-btn-primary');

					if (!countdownInterval) {
						countdownInterval = window.setInterval(updateState, 200);
					}
				} else {
					handleRevert();
				}
			} else {
				revealBtn.textContent = 'REVEAL INPUT';
				revealBtn.classList.remove('vaulton-btn-primary');
				revealBtn.classList.add('vaulton-btn-secondary');

				clearTimer();
			}
		};

		const handleRevert = () => {
			targetInput.type = 'password';
			delete targetInput.dataset.vaultonRevealExpires;
			clearTimer();
			updateState();
		};

		const handleToggle = (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			const isRevealed = !!targetInput.dataset.vaultonRevealExpires;

			if (isRevealed) {
				handleRevert();
			} else {
				const expires = Date.now() + REVEAL_DURATION_MS;
				targetInput.dataset.vaultonRevealExpires = expires.toString();
				targetInput.type = 'text';
				updateState();
			}
		};

		updateState();

		revealBtn.addEventListener('click', handleToggle);

		const isPasswordInput =
			targetInput.type === 'password' ||
			targetInput.autocomplete?.toLowerCase().includes('password') ||
			targetInput.autocomplete?.toLowerCase() === 'current-password' ||
			targetInput.autocomplete?.toLowerCase() === 'new-password' ||
			!!targetInput.dataset.vaultonRevealExpires;

		if (isPasswordInput) {
			toolsContainer.appendChild(revealBtn);
		}

		const showAllBtn = document.createElement('button');
		showAllBtn.textContent = 'Show All';
		showAllBtn.className = 'vaulton-btn vaulton-btn-primary';

		showAllBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			onShowAll();
		});

		toolsContainer.appendChild(showAllBtn);
		header.appendChild(toolsContainer);
		return header;
	}

	private createGenerationItem(
		onGenerate: () => void,
		isRegistration?: boolean,
	): HTMLElement {
		const item = document.createElement('div');
		item.className = 'vaulton-credential-item vaulton-gen-item';

		const bg = isRegistration ? '#7c3aed' : 'transparent';
		const hoverBg = isRegistration ? '#8b5cf6' : '#27272a';
		const textColor = 'white';
		const subColor = isRegistration ? '#ddd6fe' : '#a1a1aa';

		item.style.cssText = `
			padding: 10px 12px;
			cursor: pointer;
			border-radius: 8px;
			transition: all 0.2s;
			background: ${bg};
			display: flex;
			align-items: center;
			gap: 10px;
		`;

		item.innerHTML = `
			<div style="flex-shrink: 0; color: ${textColor};">
				<svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
					<path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"></path>
				</svg>
			</div>
			<div style="flex: 1;">
				<div style="color: ${textColor}; font-size: 14px; font-weight: 600;">
					Generate Secure Password
				</div>
				<div style="color: ${subColor}; font-size: 11px;">
					Created with high entropy
				</div>
			</div>
		`;

		item.addEventListener('mouseenter', () => {
			item.style.background = hoverBg;
		});

		item.addEventListener('mouseleave', () => {
			item.style.background = bg;
		});

		item.addEventListener('click', (e) => {
			e.stopPropagation();
			onGenerate();
			this.hide();
		});

		return item;
	}

	private setupStickyListeners(
		picker: HTMLElement,
		targetInput: HTMLInputElement,
	): void {
		this.repositionListener = () => this.positionPicker(picker, targetInput);
		window.addEventListener('scroll', this.repositionListener, {
			capture: true,
			passive: true,
		});
		window.addEventListener('resize', this.repositionListener, {
			capture: true,
			passive: true,
		});

		this.intersectionObserver = new IntersectionObserver(
			(entries) => {
				if (!entries[0].isIntersecting && this.element) {
					this.hide();
				}
			},
			{ threshold: 0 },
		);
		this.intersectionObserver.observe(targetInput);
	}

	private createCredentialItem(
		cred: CredentialOption,
		onSelect: (cred: CredentialOption) => void,
	): HTMLElement {
		const item = document.createElement('div');
		item.className = 'vaulton-credential-item';
		item.style.cssText = `
			padding: 10px 12px;
			cursor: pointer;
			border-radius: 8px;
			transition: background 0.15s;
			margin-bottom: 4px;
		`;

		item.innerHTML = `
			<div style="color: white; font-size: 14px; font-weight: 600; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
				${escapeHtml(cred.title)}
			</div>
			<div style="color: #d4d4d8; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
				${escapeHtml(cred.username)}
			</div>
		`;

		item.addEventListener('mouseenter', () => {
			item.style.background = '#27272a';
		});

		item.addEventListener('mouseleave', () => {
			item.style.background = 'transparent';
		});

		item.addEventListener('click', (e) => {
			e.stopPropagation();
			onSelect(cred);
			this.hide();
		});

		return item;
	}

	private determineInitialPosition(targetInput: HTMLInputElement): void {
		const visualContainer = this.findVisualContainer(targetInput);
		const rect = visualContainer.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		const spaceAbove = rect.top;

		if (spaceBelow < 250 && spaceAbove > spaceBelow) {
			this.initialSide = 'top';
			this.initialMaxHeight = spaceAbove - 10;
		} else {
			this.initialSide = 'bottom';
			this.initialMaxHeight = Math.min(420, spaceBelow - 10);
		}
	}

	private findVisualContainer(input: HTMLInputElement): HTMLElement {
		let current: HTMLElement | null = input.parentElement;

		for (let i = 0; i < 3; i++) {
			if (!current) break;

			const className = current.className || '';
			const isFuiInput = className.includes('fui-Input');
			const isFormControl = className.includes('form-control');
			const isInputWrapper =
				className.includes('input-wrapper') ||
				className.includes('field-wrapper');

			if (isFuiInput || isFormControl || isInputWrapper) {
				return current;
			}

			const parentRect = current.getBoundingClientRect();
			const inputRect = input.getBoundingClientRect();

			if (
				parentRect.width > inputRect.width + 10 &&
				parentRect.height < inputRect.height + 20
			) {
				return current;
			}

			current = current.parentElement;
		}

		return input;
	}

	private positionPicker(
		picker: HTMLElement,
		targetInput: HTMLInputElement,
	): void {
		const visualContainer = this.findVisualContainer(targetInput);
		const rect = visualContainer.getBoundingClientRect();

		picker.style.setProperty('position', 'fixed', 'important');
		picker.style.setProperty(
			'max-height',
			`${this.initialMaxHeight}px`,
			'important',
		);

		if (this.initialSide === 'top') {
			picker.style.setProperty(
				'bottom',
				`${window.innerHeight - rect.top + 4}px`,
				'important',
			);
			picker.style.removeProperty('top');
		} else {
			picker.style.setProperty('top', `${rect.bottom + 4}px`, 'important');
			picker.style.removeProperty('bottom');
		}

		picker.style.setProperty('left', `${rect.left}px`, 'important');
		picker.style.setProperty('width', `${rect.width}px`, 'important');

		if (rect.width < 325) {
			picker.setAttribute('data-vaulton-narrow', 'true');
		} else {
			picker.removeAttribute('data-vaulton-narrow');
		}
	}
}
