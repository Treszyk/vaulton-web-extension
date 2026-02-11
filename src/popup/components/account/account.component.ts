import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../../core/auth/session.service';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { StorageCore } from '../../../core/storage/storage-core';

@Component({
	selector: 'app-account',
	standalone: true,
	imports: [CommonModule, ConfirmModalComponent],
	template: `
		<div class="settings-tab">
			<div class="settings-content">
				<div class="settings-section">
					<h3>Account</h3>
					<div class="account-card">
						<div class="item-info">
							<span class="item-label">Account ID</span>
							<code class="guid-display">{{
								auth.accountId() || 'Unknown'
							}}</code>
							<p class="item-desc">Your unique, anonymous identifier.</p>
						</div>
					</div>

					<div class="action-item">
						<div class="item-info">
							<span class="item-label">Enable Autofill</span>
							<p class="item-desc">
								Automatically detect and fill login forms.
							</p>
						</div>
						<label
							class="toggle-switch"
							*ngIf="isLoaded()">
							<input
								type="checkbox"
								[checked]="autofillEnabled()"
								(change)="toggleAutofill($event)" />
							<span class="slider"></span>
						</label>
					</div>

					<div class="action-item">
						<div class="item-info">
							<span class="item-label">Account Session</span>
							<p class="item-desc">Securely terminate your current session.</p>
						</div>
						<button
							class="btn-logout"
							(click)="showLogoutConfirm.set(true)">
							Log Out
						</button>
					</div>

					<div class="action-item">
						<div class="item-info">
							<span class="item-label">Logout Everywhere</span>
							<p class="item-desc">
								Invalidate all active sessions across all devices.
							</p>
						</div>
						<button
							class="btn-logout"
							(click)="showLogoutAllConfirm.set(true)">
							Log out All
						</button>
					</div>

					<div class="action-item">
						<div class="item-info">
							<span class="item-label">Wipe Local Data</span>
							<p class="item-desc">
								Logout and delete all locally stored user data.
							</p>
						</div>
						<button
							class="btn-logout"
							(click)="showWipeConfirm.set(true)">
							Wipe All
						</button>
					</div>
				</div>
			</div>
		</div>

		<app-confirm-modal
			*ngIf="showLogoutConfirm()"
			title="Confirm Logout"
			message="This will securely clear your session and vault access keys. Do you want to proceed?"
			confirmLabel="Logout Now"
			[isDanger]="true"
			(confirm)="onLogout()"
			(cancel)="showLogoutConfirm.set(false)">
		</app-confirm-modal>

		<app-confirm-modal
			*ngIf="showLogoutAllConfirm()"
			title="Logout All Devices"
			message="This will terminate all active sessions including this one. You will need to log in again on all devices. Proceed?"
			confirmLabel="Logout Everywhere"
			[isDanger]="true"
			(confirm)="onLogoutAll()"
			(cancel)="showLogoutAllConfirm.set(false)">
		</app-confirm-modal>

		<app-confirm-modal
			*ngIf="showWipeConfirm()"
			title="Wipe Local Data"
			message="This will log you out and PERMANENTLY delete all locally cached vault data and settings. Proceed with the wipe?"
			confirmLabel="Wipe Everything"
			[isDanger]="true"
			(confirm)="onWipeAll()"
			(cancel)="showWipeConfirm.set(false)">
		</app-confirm-modal>
	`,
	styles: [
		`
			:host {
				display: flex;
				flex-direction: column;
				flex: 1;
				min-height: 0;
			}

			* {
				box-sizing: border-box;
			}

			.settings-tab {
				flex: 1;
				overflow-y: auto;
				overflow-x: hidden;
				padding: 24px 20px;
				background: transparent;
				display: flex;
				flex-direction: column;
			}

			.settings-content {
				display: flex;
				flex-direction: column;
				gap: 40px;
				width: 100%;
				min-width: 0;
				overflow-x: hidden;
			}

			.settings-section {
				display: flex;
				flex-direction: column;
				gap: 16px;
			}

			.settings-section h3 {
				color: #a78bfa;
				font-size: 12px;
				font-weight: 950;
				margin: 0;
				text-transform: uppercase;
				letter-spacing: 0.15em;
			}

			.item-info {
				display: flex;
				flex-direction: column;
				gap: 4px;
				flex: 1;
			}

			.item-label {
				color: rgba(255, 255, 255, 0.95);
				font-size: 13px;
				font-weight: 800;
			}

			.item-desc {
				color: #d4d4d8;
				font-size: 11px;
				margin: 0;
				font-weight: 600;
			}

			.account-card {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 20px;
				background: #09090b;
				border: 1px solid #18181b;
				border-radius: 1.25rem;
			}

			.guid-display {
				background: transparent;
				color: #a78bfa;
				padding: 0;
				font-family: 'JetBrains Mono', monospace;
				font-size: 13px;
				word-break: break-all;
				border: none;
				margin: 4px 0;
			}

			.action-item {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 24px;
				padding: 20px;
				background: #09090b;
				border: 1px solid #18181b;
				border-radius: 1.25rem;
			}

			.btn-logout {
				background: #0a0a0a;
				border: 1px solid #27272a;
				color: #ff4d4d;
				padding: 10px 18px;
				border-radius: 1rem;
				font-size: 12px;
				font-weight: 950;
				cursor: pointer;
				transition: all 0.2s;
				text-transform: uppercase;
				letter-spacing: 0.1em;
			}

			.btn-logout:hover {
				background: #ef4444 !important;
				border-color: #ef4444 !important;
				color: black !important;
				transform: translateY(-1px);
				box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
			}

			.toggle-switch {
				position: relative;
				display: inline-block;
				width: 44px;
				height: 24px;
			}

			.toggle-switch input {
				opacity: 0;
				width: 0;
				height: 0;
			}

			.slider {
				position: absolute;
				cursor: pointer;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background-color: #27272a;
				transition: 0.4s;
				border-radius: 24px;
				border: 1px solid #3f3f46;
			}

			.slider:before {
				position: absolute;
				content: '';
				height: 18px;
				width: 18px;
				left: 2px;
				bottom: 2px;
				background-color: white;
				transition: 0.4s;
				border-radius: 50%;
			}

			input:checked + .slider {
				background-color: #7c3aed;
				border-color: #8b5cf6;
			}

			input:checked + .slider:before {
				transform: translateX(20px);
			}
		`,
	],
})
export class AccountComponent {
	auth = inject(SessionService);

	showLogoutConfirm = signal(false);
	showLogoutAllConfirm = signal(false);
	showWipeConfirm = signal(false);
	autofillEnabled = signal(false);
	isLoaded = signal(false);

	constructor() {
		this.loadAutofillState();
	}

	async loadAutofillState() {
		const result = await StorageCore.get(StorageCore.KEYS.AUTOFILL_ENABLED);
		this.autofillEnabled.set(result !== false);
		this.isLoaded.set(true);
	}

	async toggleAutofill(event: Event) {
		const isChecked = (event.target as HTMLInputElement).checked;
		this.autofillEnabled.set(isChecked);
		await StorageCore.set(
			StorageCore.KEYS.AUTOFILL_ENABLED,
			isChecked,
			'local',
		);
	}

	async onLogout() {
		this.showLogoutConfirm.set(false);
		await this.auth.logout();
	}

	async onLogoutAll() {
		this.showLogoutAllConfirm.set(false);
		await this.auth.logoutAll();
	}

	async onWipeAll() {
		this.showWipeConfirm.set(false);
		await this.auth.wipeAllData();
	}
}
