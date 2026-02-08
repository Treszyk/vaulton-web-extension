import { escapeHtml } from './dom-utils';

export interface CredentialOption {
	id: string;
	title: string;
	username: string;
	password: string;
	website: string;
}

export class CredentialPicker {
	private element: HTMLElement | null = null;

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
		);
		this.positionPicker(picker, targetInput);

		document.body.appendChild(picker);
		this.element = picker;

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
		if (this.element) {
			this.element.remove();
			this.element = null;
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
			min-width: 280px !important;
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

		this.positionPicker(picker, targetInput);
		document.body.appendChild(picker);
		this.element = picker;

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

		if (domain && onShowAll) {
			const header = this.createHeader(domain, credentials.length, onShowAll);
			picker.appendChild(header);
		}

		const listContainer = document.createElement('div');
		listContainer.style.cssText = `
			padding: 8px;
			overflow-y: auto;
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
					No credentials found${domain ? ' for this site' : ''}
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

		const style = document.createElement('style');
		style.textContent = `
			@keyframes vaultonPickerSlideIn {
				from {
					opacity: 0;
					transform: translateY(-8px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}
			.vaulton-credential-picker::-webkit-scrollbar {
				width: 6px;
			}
			.vaulton-credential-picker::-webkit-scrollbar-track {
				background: transparent;
			}
			.vaulton-credential-picker::-webkit-scrollbar-thumb {
				background: #27272a;
				border-radius: 99px;
			}
			.vaulton-credential-picker::-webkit-scrollbar-thumb:hover {
				background: #3f3f46;
			}
		`;
		document.head.appendChild(style);

		return picker;
	}

	private createHeader(
		domain: string,
		count: number,
		onShowAll: () => void,
	): HTMLElement {
		const header = document.createElement('div');
		header.style.cssText = `
			padding: 12px 12px 8px 12px;
			border-bottom: 1px solid #27272a;
			display: flex;
			justify-content: space-between;
			align-items: center;
		`;

		header.innerHTML = `
			<div style="flex: 1;">
				<div style="color: #d4d4d8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
					Credentials for
				</div>
				<div style="color: white; font-size: 13px; font-weight: 600;">
					${escapeHtml(domain)} ${count > 0 ? `(${count})` : ''}
				</div>
			</div>
		`;

		const showAllBtn = document.createElement('button');
		showAllBtn.textContent = 'Show All';
		showAllBtn.style.cssText = `
			background: #7c3aed;
			color: white;
			border: none;
			border-radius: 8px;
			padding: 6px 12px;
			font-size: 11px;
			font-weight: 600;
			cursor: pointer;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			transition: background 0.2s;
		`;

		showAllBtn.addEventListener('mouseenter', () => {
			showAllBtn.style.background = '#8b5cf6';
		});

		showAllBtn.addEventListener('mouseleave', () => {
			showAllBtn.style.background = '#7c3aed';
		});

		showAllBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			onShowAll();
		});

		header.appendChild(showAllBtn);
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
			<div style="color: white; font-size: 14px; font-weight: 600; margin-bottom: 2px;">
				${escapeHtml(cred.title)}
			</div>
			<div style="color: #d4d4d8; font-size: 12px;">
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

	private positionPicker(
		picker: HTMLElement,
		targetInput: HTMLInputElement,
	): void {
		const rect = targetInput.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		const spaceAbove = rect.top;

		if (spaceBelow < 250 && spaceAbove > spaceBelow) {
			picker.style.setProperty(
				'bottom',
				`${window.innerHeight - rect.top - window.scrollY + 4}px`,
				'important',
			);
			picker.style.setProperty(
				'max-height',
				`${spaceAbove - 10}px`,
				'important',
			);
		} else {
			picker.style.setProperty(
				'top',
				`${rect.bottom + window.scrollY + 4}px`,
				'important',
			);
			const potentialHeight = Math.min(420, spaceBelow - 10);
			picker.style.setProperty(
				'max-height',
				`${potentialHeight}px`,
				'important',
			);
		}

		picker.style.setProperty(
			'left',
			`${rect.left + window.scrollX}px`,
			'important',
		);
		picker.style.setProperty('width', `${rect.width}px`, 'important');
	}
}
