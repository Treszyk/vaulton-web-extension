import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../core/auth/session.service';
import { VaultService } from '../core/vault/vault.service';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [CommonModule, LoginComponent, MainLayoutComponent],
	template: `
		<div
			class="vaulton-app"
			[class.authenticated]="auth.isAuthenticated()">
			<div class="starfield">
				<div class="stars"></div>
				<div class="stars2"></div>
				<div class="stars3"></div>
			</div>

			<div class="content-wrapper">
				<header class="auth-header">
					<div class="logo-container">
						<h1 class="logo">Vaulton<span class="dot">.</span></h1>
						<p class="tagline">Zero-Knowledge Privacy</p>
					</div>
					<button
						*ngIf="auth.isAuthenticated()"
						class="discrete-refresh"
						(click)="onRefresh()"
						[class.spinning]="loading"
						title="Refresh Vault">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
					</button>
				</header>

				<main [class.main-full]="auth.isAuthenticated()">
					<app-login
						*ngIf="!auth.isAuthenticated()"
						[loading]="loading"
						(login)="onLogin($event)"
						(togglePersistence)="onTogglePersistence($event)">
					</app-login>

					<app-main-layout *ngIf="auth.isAuthenticated()"> </app-main-layout>
				</main>

				<footer *ngIf="!auth.isAuthenticated()">
					<div
						class="error-toast animate-shake"
						*ngIf="error">
						{{ error }}
					</div>
				</footer>
			</div>
		</div>
	`,
	styles: [
		`
			:host {
				display: block;
				width: 360px;
				min-height: 500px;
				background: #000;
				color: #fff;
				font-family:
					'Inter',
					-apple-system,
					sans-serif;
				overflow: hidden;
			}
			:host ::ng-deep *::-webkit-scrollbar {
				width: 10px;
				background: transparent;
			}
			:host ::ng-deep *::-webkit-scrollbar-thumb {
				background: rgba(255, 255, 255, 0.2);
				border-radius: 4px;
				border: 2px solid #000;
				background-clip: padding-box;
			}
			:host ::ng-deep *::-webkit-scrollbar-thumb:hover {
				background: rgba(255, 255, 255, 0.4);
				border: 2px solid #000;
				background-clip: padding-box;
			}
			.vaulton-app {
				position: relative;
				width: 360px;
				height: 500px;
				box-sizing: border-box;
				overflow: hidden;
				padding: 0;
				display: flex;
				flex-direction: column;
			}
			.vaulton-app.authenticated {
				padding: 0;
			}
			.starfield {
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				overflow: hidden;
				z-index: 0;
				background: #000;
			}
			.stars,
			.stars2,
			.stars3 {
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: transparent;
			}
			.stars {
				width: 1px;
				height: 1px;
				box-shadow:
					100px 100px #fff,
					200px 300px #fff,
					400px 150px #fff,
					250px 450px #fff,
					50px 400px #fff;
				animation: animStar 50s linear infinite;
			}
			.stars2 {
				width: 2px;
				height: 2px;
				box-shadow:
					150px 150px #fff,
					350px 100px #fff,
					50px 250px #fff;
				animation: animStar 100s linear infinite;
				opacity: 0.5;
			}
			.stars3 {
				width: 3px;
				height: 3px;
				box-shadow:
					200px 200px #fff,
					300px 50px #fff,
					100px 400px #fff;
				animation: animStar 150s linear infinite;
				opacity: 0.3;
			}
			@keyframes animStar {
				from {
					transform: translateY(0);
				}
				to {
					transform: translateY(-500px);
				}
			}
			.content-wrapper {
				position: relative;
				z-index: 10;
				flex: 1;
				display: flex;
				flex-direction: column;
				min-height: 0;
			}
			.auth-header {
				margin-bottom: 24px;
				text-align: left;
				padding: 24px 24px 0 24px;
				z-index: 100;
				display: flex;
				align-items: flex-start;
				justify-content: space-between;
			}
			.authenticated .auth-header {
				margin-bottom: 12px;
			}
			main {
				flex: 1;
				display: flex;
				flex-direction: column;
				min-height: 0;
			}
			main.main-full {
				width: 100%;
			}
			.logo {
				font-size: 24px;
				font-weight: 900;
				margin: 0;
				letter-spacing: -1.5px;
				background: linear-gradient(135deg, #fff 0%, #d4d4d8 100%);
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
				line-height: 1;
			}
			.logo .dot {
				color: #7c3aed;
				-webkit-text-fill-color: #7c3aed;
			}
			.tagline {
				font-size: 10px;
				text-transform: uppercase;
				letter-spacing: 2px;
				color: #a1a1aa;
				margin: 4px 0 0 0;
				font-weight: 600;
			}
			.status-indicator {
				padding: 6px 0;
				font-size: 10px;
				font-weight: 800;
				text-transform: uppercase;
				letter-spacing: 1px;
				color: #a1a1aa;
			}
			.status-indicator.active {
				color: #a78bfa;
			}
			footer {
				margin-top: 24px;
				text-align: center;
			}
			.footer-note {
				font-size: 10px;
				color: #3f3f46;
				text-transform: uppercase;
				letter-spacing: 1px;
			}
			.error-toast {
				background: rgba(239, 68, 68, 0.1);
				border: 1px solid rgba(239, 68, 68, 0.2);
				color: #fca5a5;
				font-size: 11px;
				padding: 10px;
				border-radius: 8px;
				margin-bottom: 8px;
			}
			.animate-slide-up {
				animation: slideUp 0.5s cubic-bezier(0, 0.6, 0.4, 1);
			}
			@keyframes slideUp {
				from {
					transform: translateY(20px);
					opacity: 0;
				}
				to {
					transform: translateY(0);
					opacity: 1;
				}
			}
			.animate-shake {
				animation: shake 0.4s ease-in-out;
			}
			@keyframes shake {
				0%,
				100% {
					transform: translateX(0);
				}
				25% {
					transform: translateX(-4px);
				}
				75% {
					transform: translateX(4px);
				}
			}
			.discrete-refresh {
				background: rgba(124, 58, 237, 0.1);
				border: 1px solid rgba(124, 58, 237, 0.3);
				color: #a78bfa;
				cursor: pointer;
				padding: 8px;
				border-radius: 12px;
				transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
				display: flex;
				align-items: center;
				justify-content: center;
			}
			.discrete-refresh svg {
				width: 16px;
				height: 16px;
			}
			.discrete-refresh:hover {
				background: #7c3aed;
				border-color: #8b5cf6;
				color: white;
				transform: scale(1.05);
				box-shadow: 0 0 15px rgba(124, 58, 237, 0.4);
			}
			.spinning svg {
				animation: spin 1s linear infinite;
			}
			@keyframes spin {
				from {
					transform: rotate(0deg);
				}
				to {
					transform: rotate(360deg);
				}
			}
		`,
	],
})
export class AppComponent implements OnInit {
	loading = false;
	error = '';
	auth = inject(SessionService);
	vault = inject(VaultService);

	constructor(private cdr: ChangeDetectorRef) {}

	ngOnInit() {
		this.auth.tryRestore().then(() => {
			if (this.auth.isAuthenticated()) {
				this.vault.syncVault();
			}
			this.cdr.detectChanges();
		});
	}

	async onLogin(creds: { email: string; password: string }) {
		this.loading = true;
		this.error = '';
		try {
			await this.auth.login(creds.email, creds.password);
			await this.vault.syncVault();
		} catch (e: any) {
			this.error = e.message || 'Vault Unlock Failed';
		} finally {
			this.loading = false;
			this.cdr.detectChanges();
		}
	}

	async onLogout() {
		this.error = '';
		try {
			await this.auth.logout();
		} catch (e: any) {
			this.error = 'Logout sequence interrupted';
		} finally {
			this.cdr.detectChanges();
		}
	}

	async onRefresh() {
		this.loading = true;
		this.error = '';
		try {
			await this.vault.syncVault(true);
		} catch (e: any) {
			this.error = 'Vault sync failed';
		} finally {
			this.loading = false;
			this.cdr.detectChanges();
		}
	}

	async onTogglePersistence(val: boolean) {
		await this.auth.toggleNeverLockout(val);
		this.cdr.detectChanges();
	}

	async onCheckStatus() {
		try {
			await this.auth.checkVaultStatus();
			this.error = this.auth.isLocked()
				? 'Vault is Locked'
				: 'Vault is Unlocked & Active';
			setTimeout(() => {
				if (this.error.includes('Vault is Unlocked')) this.error = '';
			}, 3000);
		} catch (e: any) {
			this.error = 'Status check failed';
		} finally {
			this.cdr.detectChanges();
		}
	}

	async onWipeData() {
		if (
			confirm(
				'CRITICAL: This will destroy ALL local vault keys and session data. Are you absolutely sure?',
			)
		) {
			(globalThis as any).chrome?.storage?.local?.clear();
			(globalThis as any).chrome?.storage?.session?.clear();
			location.reload();
		}
	}
}
