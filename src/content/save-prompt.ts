import { escapeHtml } from './dom-utils';

export type SaveAction = 'save' | 'update' | 'never' | 'not-now';

export class SavePrompt {
	private element: HTMLElement | null = null;
	private timeoutId: number | null = null;

	show(
		action: 'save' | 'update',
		domain: string,
		username: string,
		onAction: (action: SaveAction) => void,
	): void {
		this.hide();

		const prompt = document.createElement('div');
		prompt.className = 'vaulton-save-prompt';
		prompt.style.cssText = `
			position: fixed !important;
			top: 20px !important;
			right: 20px !important;
			background: #18181b !important;
			border: 1px solid #27272a !important;
			border-radius: 12px !important;
			padding: 16px !important;
			min-width: 320px !important;
			max-width: 400px !important;
			z-index: 999999 !important;
			box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
			font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
			animation: vaultonSlideIn 0.3s ease-out !important;
			color: white !important;
		`;

		const title = action === 'save' ? 'Save Password?' : 'Update Password?';
		const message =
			action === 'save'
				? `Save credentials for <strong>${escapeHtml(domain)}</strong>?`
				: `Update password for <strong>${escapeHtml(username)}</strong> on <strong>${escapeHtml(domain)}</strong>?`;

		prompt.innerHTML = `
			<div style="margin-bottom: 12px;">
				<div style="font-size: 15px; font-weight: 600; margin-bottom: 4px; color: white;">${title}</div>
				<div style="font-size: 13px; color: #a1a1aa;">${message}</div>
			</div>
			<div style="display: flex; gap: 8px; flex-direction: column;">
				<button class="vaulton-save-btn" style="
					background: #9333ea;
					color: white;
					border: none;
					border-radius: 6px;
					padding: 8px 16px;
					font-size: 13px;
					font-weight: 500;
					cursor: pointer;
					transition: background 0.2s;
				">${action === 'save' ? 'Save' : 'Update'}</button>
				<div style="display: flex; gap: 8px;">
					<button class="vaulton-not-now-btn" style="
						flex: 1;
						background: #27272a;
						color: #e4e4e7;
						border: 1px solid #3f3f46;
						border-radius: 6px;
						padding: 6px 12px;
						font-size: 12px;
						font-weight: 500;
						cursor: pointer;
						transition: all 0.2s;
					">Not now</button>
					<button class="vaulton-never-btn" style="
						flex: 1;
						background: #7f1d1d;
						color: #ffffff;
						border: 1px solid #991b1b;
						border-radius: 6px;
						padding: 6px 12px;
						font-size: 12px;
						font-weight: 500;
						cursor: pointer;
						transition: all 0.2s;
					">Never for this site</button>
				</div>
			</div>
		`;

		const style = document.createElement('style');
		style.textContent = `
			@keyframes vaultonSlideIn {
				from {
					opacity: 0;
					transform: translateX(100px);
				}
				to {
					opacity: 1;
					transform: translateX(0);
				}
			}
		`;
		document.head.appendChild(style);

		const saveBtn = prompt.querySelector('.vaulton-save-btn') as HTMLElement;
		const neverBtn = prompt.querySelector('.vaulton-never-btn') as HTMLElement;
		const notNowBtn = prompt.querySelector(
			'.vaulton-not-now-btn',
		) as HTMLElement;

		saveBtn.addEventListener('mouseenter', () => {
			saveBtn.style.background = '#7e22ce';
		});
		saveBtn.addEventListener('mouseleave', () => {
			saveBtn.style.background = '#9333ea';
		});

		neverBtn.addEventListener('mouseenter', () => {
			neverBtn.style.background = '#b91c1c';
			neverBtn.style.borderColor = '#dc2626';
		});
		neverBtn.addEventListener('mouseleave', () => {
			neverBtn.style.background = '#7f1d1d';
			neverBtn.style.borderColor = '#991b1b';
		});

		notNowBtn.addEventListener('mouseenter', () => {
			notNowBtn.style.background = '#3f3f46';
			notNowBtn.style.color = '#ffffff';
		});
		notNowBtn.addEventListener('mouseleave', () => {
			notNowBtn.style.background = '#27272a';
			notNowBtn.style.color = '#e4e4e7';
		});

		saveBtn.addEventListener('click', () => {
			onAction(action);
			this.hide();
		});

		neverBtn.addEventListener('click', () => {
			onAction('never');
			this.hide();
		});

		notNowBtn.addEventListener('click', () => {
			onAction('not-now');
			this.hide();
		});

		document.body.appendChild(prompt);
		this.element = prompt;

		this.timeoutId = window.setTimeout(() => {
			onAction('not-now');
			this.hide();
		}, 15000);
	}

	hide(): void {
		if (this.element) {
			this.element.remove();
			this.element = null;
		}
		if (this.timeoutId !== null) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}
}
