import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VaultListComponent } from '../vault-list/vault-list.component';
import { SettingsComponent } from '../settings/settings.component';

type Tab = 'vault' | 'security' | 'settings';

@Component({
	selector: 'app-main-layout',
	standalone: true,
	imports: [CommonModule, VaultListComponent, SettingsComponent],
	template: `
		<div class="layout-container">
			<main class="content-area">
				<app-vault-list *ngIf="activeTab() === 'vault'"></app-vault-list>

				<div
					class="placeholder-tab"
					*ngIf="activeTab() === 'security'">
					<div class="empty-state">
						<svg
							class="large-icon"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
						</svg>
						<h3>Security Hub</h3>
						<p>Password generator coming soon.</p>
					</div>
				</div>

				<app-settings *ngIf="activeTab() === 'settings'"></app-settings>
			</main>

			<nav class="bottom-nav tab-switcher">
				<button
					class="nav-tab"
					[class.active]="activeTab() === 'vault'"
					(click)="setTab('vault')">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
					</svg>
					<span>Vault</span>
				</button>
				<button
					class="nav-tab"
					[class.active]="activeTab() === 'security'"
					(click)="setTab('security')">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
					</svg>
					<span>Security</span>
				</button>
				<button
					class="nav-tab"
					[class.active]="activeTab() === 'settings'"
					(click)="setTab('settings')">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					<span>Settings</span>
				</button>
				<div
					class="nav-indicator"
					[style.transform]="getIndicatorTransform()"
					[style.width]="getIndicatorWidth()"></div>
			</nav>
		</div>
	`,
	styles: [
		`
			:host {
				display: flex;
				flex-direction: column;
				flex: 1;
				min-height: 0;
			}

			.layout-container {
				display: flex;
				flex-direction: column;
				height: 100%;
				width: 100%;
				position: relative;
				overflow: hidden;
			}

			/* Custom Scrollbar */
			.content-area::-webkit-scrollbar {
				width: 4px;
				background: transparent;
			}
			.content-area::-webkit-scrollbar-thumb {
				background: rgba(255, 255, 255, 0.2);
				border-radius: 4px;
			}
			.content-area::-webkit-scrollbar-thumb:hover {
				background: rgba(255, 255, 255, 0.4);
			}

			.logo {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.logo h1 {
				font-size: 24px;
				font-weight: 900;
				margin: 0;
				letter-spacing: -1.5px;
				background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
			}
			.logo .dot {
				color: #7c3aed;
				-webkit-text-fill-color: #7c3aed;
			}

			.content-area {
				flex: 1;
				overflow: hidden;
				padding: 0;
				min-height: 0;
				display: flex;
				flex-direction: column;
			}

			.bottom-nav {
				background: #09090b;
				border-top: 1px solid rgba(255, 255, 255, 0.1);
				padding: 0;
				z-index: 1000;
			}

			.tab-switcher {
				display: flex;
				padding: 12px 16px;
				position: relative;
				z-index: 20;
				margin: 0;
				width: 100%;
				box-sizing: border-box;
				box-sizing: border-box;
			}

			.nav-tab {
				flex: 1;
				background: none;
				border: none;
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				gap: 4px;
				padding: 10px 0;
				color: rgba(255, 255, 255, 0.4);
				cursor: pointer;
				transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
				position: relative;
				z-index: 2;
				border-radius: 12px;
			}

			.nav-tab:hover {
				color: rgba(255, 255, 255, 0.7);
				background: rgba(255, 255, 255, 0.03);
			}

			.nav-tab svg {
				width: 20px;
				height: 20px;
			}

			.nav-tab span {
				font-size: 10px;
				font-weight: 700;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}

			.nav-tab.active {
				color: white;
			}

			.nav-indicator {
				position: absolute;
				left: 16px;
				top: 12px;
				bottom: 12px;
				background: #7c3aed;
				border-radius: 12px;
				transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
				z-index: 1;
				box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
			}

			.placeholder-tab {
				height: 100%;
				display: flex;
				align-items: center;
				justify-content: center;
			}

			.empty-state {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 16px;
				color: var(--v-text-muted);
				text-align: center;
				padding: 40px;
			}

			.large-icon {
				width: 64px;
				height: 64px;
				color: var(--v-grey-light);
			}

			.empty-state h3 {
				color: white;
				margin: 0;
				font-size: 20px;
			}

			.refresh-btn {
				background: transparent;
				border: none;
				color: rgba(255, 255, 255, 0.4);
				cursor: pointer;
				padding: 8px;
				border-radius: 50%;
				transition: all 0.2s;
			}
			.refresh-btn:hover {
				background: rgba(255, 255, 255, 0.05);
				color: white;
			}

			@keyframes spin {
				from {
					transform: rotate(0deg);
				}
				to {
					transform: rotate(360deg);
				}
			}

			.spinning svg {
				animation: spin 1s linear infinite;
			}
		`,
	],
})
export class MainLayoutComponent {
	activeTab = signal<Tab>('vault');

	setTab(tab: Tab) {
		this.activeTab.set(tab);
	}

	getIndicatorWidth() {
		return `calc((100% - 32px) / 3)`;
	}

	getIndicatorTransform() {
		const index =
			this.activeTab() === 'vault'
				? 0
				: this.activeTab() === 'security'
					? 1
					: 2;
		return `translateX(${index * 100}%)`;
	}
}
