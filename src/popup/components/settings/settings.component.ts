import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../../core/auth/session.service';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';

@Component({
	selector: 'app-settings',
	standalone: true,
	imports: [CommonModule, ConfirmModalComponent],
	template: `
		<div class="settings-tab">
			<div class="settings-content">
				<div class="settings-section">
					<h3>Vault Security</h3>
					<p class="section-desc">Manage how your vault locks automatically.</p>

					<div class="selection-group">
						<button
							*ngFor="let option of lockoutOptions"
							class="selection-item"
							[class.is-active]="auth.lockoutStrategy() === option.value"
							(click)="onStrategyChange(option.value)">
							<div class="item-info">
								<span class="item-label">{{ option.label }}</span>
								<p class="item-desc">{{ option.desc }}</p>
							</div>
							<div
								class="item-check"
								*ngIf="auth.lockoutStrategy() === option.value">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="3"
										d="M5 13l4 4L19 7" />
								</svg>
							</div>
						</button>
					</div>
				</div>

				<div class="settings-section">
					<h3>Account</h3>
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

			.settings-section h3 {
				color: #a78bfa;
				font-size: 12px;
				font-weight: 950;
				margin: 0 0 4px 0;
				text-transform: uppercase;
				letter-spacing: 0.15em;
			}

			.section-desc {
				color: #a1a1aa;
				font-size: 11px;
				font-weight: 600;
				margin: 0 0 24px 0;
			}

			.selection-group {
				display: flex;
				flex-direction: column;
				gap: 12px;
				width: 100%;
			}

			.selection-item {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 16px 20px;
				background: #09090b;
				border: 1px solid #18181b;
				border-radius: 1.25rem;
				cursor: pointer;
				text-align: left;
				transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
			}

			.selection-item:hover {
				background: #18181b;
				border-color: #27272a;
				transform: translateY(-2px);
			}

			.selection-item.is-active {
				background: rgba(124, 58, 237, 0.05);
				border-color: #7c3aed;
				box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
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
				color: #a1a1aa;
				font-size: 11px;
				margin: 0;
				font-weight: 600;
			}

			.item-check {
				width: 20px;
				height: 20px;
				color: #7c3aed;
				animation: checkPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
			}

			@keyframes checkPop {
				from {
					transform: scale(0.5);
					opacity: 0;
				}
				to {
					transform: scale(1);
					opacity: 1;
				}
			}

			.action-item {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 20px;
				background: #09090b;
				border: 1px solid #18181b;
				border-radius: 1.25rem;
			}

			.btn-logout {
				background: rgba(239, 68, 68, 0.1);
				border: 1px solid rgba(239, 68, 68, 0.2);
				color: #ef4444;
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
				background: #ef4444;
				color: white;
				transform: translateY(-2px);
				box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
			}
		`,
	],
})
export class SettingsComponent {
	auth = inject(SessionService);
	showLogoutConfirm = signal(false);

	readonly lockoutOptions = [
		{
			value: '5',
			label: 'Inactivity (5m)',
			desc: 'Clears keys after 5 minutes of idling.',
		},
		{
			value: '15',
			label: 'Inactivity (15m)',
			desc: 'Clears keys after 15 minutes of idling.',
		},
		{
			value: '60',
			label: 'Inactivity (1h)',
			desc: 'Clears keys after 1 hour of idling.',
		},
		{
			value: 'OnQuit',
			label: 'Browser Quit',
			desc: 'Securely clears keys when browser closes.',
		},
		{
			value: 'Persistent',
			label: 'Never Lock',
			desc: '⚠️ Keys persist in system storage (Less secure).',
		},
	];

	async onStrategyChange(value: string) {
		await this.auth.setLockoutStrategy(value);
	}

	async onLogout() {
		this.showLogoutConfirm.set(false);
		await this.auth.logout();
	}
}
