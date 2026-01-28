import {
	Component,
	ChangeDetectorRef,
	inject,
	OnInit,
	HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../core/auth/session.service';
import { VaultService } from '../core/vault/vault.service';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [CommonModule, LoginComponent, MainLayoutComponent],
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
	loading = false;
	error = '';
	auth = inject(SessionService);
	vault = inject(VaultService);

	private lastResetTime = 0;
	private readonly RESET_THROTTLE_MS = 30000;

	constructor(private cdr: ChangeDetectorRef) {}

	@HostListener('mousedown')
	@HostListener('keydown')
	@HostListener('wheel')
	@HostListener('touchstart')
	onUserActivity() {
		this.resetTimerThrottled();
	}

	private resetTimerThrottled() {
		const now = Date.now();
		if (now - this.lastResetTime > this.RESET_THROTTLE_MS) {
			this.lastResetTime = now;
			chrome.runtime.sendMessage({ type: 'RESET_TIMER' });
		}
	}

	ngOnInit() {
		this.auth.tryRestore().then(async () => {
			if (this.auth.isAuthenticated()) {
				await this.vault.ensureReady();
				if (this.vault.records().length === 0) {
					this.vault.syncVault();
				}
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
			await this.vault.clearData();
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
