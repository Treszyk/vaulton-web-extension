import {
	Component,
	ChangeDetectorRef,
	inject,
	OnInit,
	HostListener,
	signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../core/auth/session.service';
import { THROTTLES } from '../core/config/throttles';
import { VaultService } from '../core/vault/vault.service';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';
import { NotificationService } from '../core/ui/notification.service';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [
		CommonModule,
		LoginComponent,
		MainLayoutComponent,
		ConfirmModalComponent,
	],
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
	loading = false;
	auth = inject(SessionService);
	vault = inject(VaultService);
	notifications = inject(NotificationService);

	showWipeConfirm = signal(false);

	private lastResetTime = 0;

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
		if (now - this.lastResetTime > THROTTLES.ACTIVITY_RESET) {
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
		try {
			await this.auth.login(creds.email, creds.password);
			await this.vault.syncVault(true);
			this.notifications.success('Vault Unlocked');
		} catch (e: any) {
			this.notifications.error(e.message || 'Vault Unlock Failed');
		} finally {
			this.loading = false;
			this.cdr.detectChanges();
		}
	}

	async onLogout() {
		try {
			await this.auth.logout();
			await this.vault.clearData();
			this.notifications.info('Session Terminated');
		} catch (e: any) {
			this.notifications.error('Logout sequence interrupted');
		} finally {
			this.cdr.detectChanges();
		}
	}

	async onRefresh() {
		this.loading = true;
		try {
			await this.vault.syncVault(true);
			this.notifications.success('Vault Synchronized');
		} catch (e: any) {
			this.notifications.error('Vault sync failed');
		} finally {
			this.loading = false;
			this.cdr.detectChanges();
		}
	}

	async onCheckStatus() {
		try {
			await this.auth.checkVaultStatus();
			const msg = this.auth.isLocked()
				? 'Vault is Locked'
				: 'Vault is Unlocked';
			this.notifications.info(msg);
		} catch (e: any) {
			this.notifications.error('Status check failed');
		} finally {
			this.cdr.detectChanges();
		}
	}

	async onWipeData() {
		this.showWipeConfirm.set(true);
	}

	async executeWipe() {
		this.showWipeConfirm.set(false);
		(globalThis as any).chrome?.storage?.local?.clear();
		(globalThis as any).chrome?.storage?.session?.clear();
		location.reload();
	}
}
