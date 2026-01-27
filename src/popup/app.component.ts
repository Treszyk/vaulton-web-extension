import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../core/auth/session.service';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [CommonModule, LoginComponent, DashboardComponent],
	template: `
		<div
			class="vaulton-app"
			[class.unlocked]="!auth.isLocked()">
			<div class="starfield">
				<div class="stars"></div>
				<div class="stars2"></div>
				<div class="stars3"></div>
			</div>

			<div class="content-wrapper animate-slide-up">
				<header>
					<div class="logo-container">
						<h1 class="logo">Vaulton<span class="dot">.</span></h1>
						<p class="tagline">Zero-Knowledge Privacy</p>
					</div>
					<div
						class="status-indicator"
						[class.active]="!auth.isLocked()">
						{{ auth.isLocked() ? 'Locked' : 'Unlocked' }}
					</div>
				</header>

				<main>
					<app-login
						*ngIf="!auth.isAuthenticated()"
						[loading]="loading"
						(login)="onLogin($event)"
						(togglePersistence)="onTogglePersistence($event)">
					</app-login>

					<app-dashboard
						*ngIf="auth.isAuthenticated()"
						[loading]="loading"
						(refresh)="onRefresh()"
						(logout)="onLogout()"
						(checkStatus)="onCheckStatus()"
						(wipeData)="onWipeData()">
					</app-dashboard>
				</main>

				<footer>
					<div
						class="error-toast"
						*ngIf="error"
						class="animate-shake">
						{{ error }}
					</div>
					<p
						class="footer-note"
						*ngIf="!error">
						Vaulton Protected Session
					</p>
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
			.vaulton-app {
				position: relative;
				width: 100%;
				min-height: 500px;
				padding: 24px;
				box-sizing: border-box;
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
			}
			header {
				display: flex;
				justify-content: space-between;
				align-items: flex-start;
				margin-bottom: 32px;
			}
			.logo {
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
			.tagline {
				font-size: 10px;
				text-transform: uppercase;
				letter-spacing: 2px;
				color: #71717a;
				margin: 4px 0 0 0;
				font-weight: 600;
			}
			.status-indicator {
				padding: 6px 0;
				font-size: 10px;
				font-weight: 800;
				text-transform: uppercase;
				letter-spacing: 1px;
				color: #71717a;
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
		`,
	],
})
export class AppComponent implements OnInit {
	loading = false;
	error = '';
	auth = inject(SessionService);

	constructor(private cdr: ChangeDetectorRef) {}

	ngOnInit() {
		this.auth.tryRestore().then(() => {
			this.cdr.detectChanges();
		});
	}

	async onLogin(creds: { email: string; password: string }) {
		this.loading = true;
		this.error = '';
		try {
			await this.auth.login(creds.email, creds.password);
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
			await this.auth.refresh();
		} catch (e: any) {
			this.error = 'Token rotation failed';
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
