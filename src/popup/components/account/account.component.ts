import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../../core/auth/session.service';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';

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

					<div
						class="action-item"
						style="margin-top: 16px;">
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
				color: #dc2626;
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
				background: rgba(220, 38, 38, 0.1);
				border-color: rgba(220, 38, 38, 0.2);
				color: #f87171;
				transform: translateY(-1px);
				box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);
			}
		`,
	],
})
export class AccountComponent {
	auth = inject(SessionService);
	showLogoutConfirm = signal(false);

	async onLogout() {
		this.showLogoutConfirm.set(false);
		await this.auth.logout();
	}
}
