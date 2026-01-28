import { resetAutoLockTimer } from './activity-tracker';

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
		onShowAll?: () => void,
		domain?: string,
	): void {
		this.hide();

		const picker = this.createPicker(credentials, onSelect, onShowAll, domain);
		this.positionPicker(picker, targetInput);

		document.body.appendChild(picker);
		this.element = picker;

		const handleOutsideClick = (e: MouseEvent) => {
			if (!picker.contains(e.target as Node)) {
				this.hide();
				document.removeEventListener('click', handleOutsideClick);
			}
		};

		setTimeout(() => {
			document.addEventListener('click', handleOutsideClick);
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
			<div style="margin-bottom: 12px; color: #a855f7;">
				<svg style="width: 32px; height: 32px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
					<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
				</svg>
			</div>
			<div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">Vault is Locked</div>
			<div style="font-size: 13px; color: #a1a1aa; margin-bottom: 16px;">Please log in to the Vaulton extension to access your credentials.</div>
		`;

		const loginNote = document.createElement('div');
		loginNote.style.cssText = `
			font-size: 11px;
			color: #71717a;
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
			if (!picker.contains(e.target as Node)) {
				this.hide();
				document.removeEventListener('click', handleOutsideClick);
			}
		};

		setTimeout(() => {
			document.addEventListener('click', handleOutsideClick);
		}, 100);
	}

	private createPicker(
		credentials: CredentialOption[],
		onSelect: (cred: CredentialOption) => void,
		onShowAll?: () => void,
		domain?: string,
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
			max-height: 360px !important;
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
			max-height: 260px !important;
		`;

		if (credentials.length === 0) {
			listContainer.innerHTML = `
				<div style="padding: 16px; text-align: center; color: #a1a1aa; font-size: 13px;">
					No credentials found${domain ? ' for this site' : ''}
				</div>
			`;
		} else {
			credentials.forEach((cred) => {
				const item = this.createCredentialItem(cred, onSelect);
				listContainer.appendChild(item);
			});
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
				<div style="color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
					Credentials for
				</div>
				<div style="color: white; font-size: 13px; font-weight: 600;">
					${this.escapeHtml(domain)} ${count > 0 ? `(${count})` : ''}
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
				${this.escapeHtml(cred.title)}
			</div>
			<div style="color: #a1a1aa; font-size: 12px;">
				${this.escapeHtml(cred.username)}
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
			resetAutoLockTimer();
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

		if (spaceBelow >= 300 || spaceBelow > spaceAbove) {
			picker.style.setProperty(
				'top',
				`${rect.bottom + window.scrollY + 4}px`,
				'important',
			);
		} else {
			picker.style.setProperty(
				'bottom',
				`${window.innerHeight - rect.top - window.scrollY + 4}px`,
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

	private escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
}
