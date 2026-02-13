import { Injectable, inject, signal } from '@angular/core';
import { StorageCore } from '../storage/storage-core';
import { AuthCryptoService } from './auth-crypto.service';
import { sendCommand } from '../messaging';
import { apiPreLogin } from '../api/auth-api.client';
import { THROTTLES } from '../config/throttles';

@Injectable({ providedIn: 'root' })
export class SessionService {
	private crypto = inject(AuthCryptoService);

	readonly isAuthenticated = signal(false);
	readonly accountId = signal<string | null>(null);
	readonly isLocked = signal(true);
	readonly isOffline = signal(false);
	readonly lockoutStrategy = signal<string>('OnQuit');
	readonly excludedSites = signal<string[]>([]);

	constructor() {
		this.initStorageListener();
		this.syncStateFromStorage();
	}

	private initStorageListener(): void {
		if (typeof chrome !== 'undefined' && chrome.storage) {
			chrome.storage.onChanged.addListener(() => {
				this.syncStateFromStorage();
			});
		}
	}

	private async syncStateFromStorage(): Promise<void> {
		const localList = [
			StorageCore.KEYS.ACCOUNT_ID,
			StorageCore.KEYS.LOCKOUT_STRATEGY,
		];
		const local = await StorageCore.getMultiple(localList);
		this.accountId.set(local[StorageCore.KEYS.ACCOUNT_ID] || null);
		this.lockoutStrategy.set(
			local[StorageCore.KEYS.LOCKOUT_STRATEGY] || 'OnQuit',
		);

		const smartList = [
			StorageCore.KEYS.ACCESS_TOKEN,
			StorageCore.KEYS.VAULT_KEY,
		];
		const data = await StorageCore.getMultiple(smartList);

		this.isAuthenticated.set(!!data[StorageCore.KEYS.ACCESS_TOKEN]);
		this.isLocked.set(!data[StorageCore.KEYS.VAULT_KEY]);

		const exclusions = await StorageCore.get(StorageCore.KEYS.EXCLUDED_SITES);
		this.excludedSites.set(exclusions || []);
	}

	async tryRestore(): Promise<void> {
		await this.syncStateFromStorage();
		if (this.isAuthenticated()) {
			await this.verifySession(THROTTLES.SESSION_HEARTBEAT);
		}
	}

	async verifySession(throttleMs: number): Promise<void> {
		try {
			const res = await sendCommand({
				type: 'VERIFY_SESSION',
				payload: { throttleMs },
			});

			if (!res.success) throw new Error(res.error);

			const status = res.data?.status;
			if (status === 'unauthorized') {
				await this.logout();
				throw new Error('Session unauthorized');
			}

			this.isOffline.set(status === 'offline');
		} catch (e) {
			console.error('[SessionService] Verification failed:', e);
		}
	}

	async login(accountId: string, password: string): Promise<void> {
		const preLogin = await apiPreLogin(accountId);
		const { verifier } = await this.crypto.buildLogin(password, preLogin);

		const startRes = await sendCommand({
			type: 'LOGIN_START',
			payload: { accountId, verifier },
		});

		if (!startRes.success || !startRes.data) {
			throw new Error(startRes.error || 'Login start failed');
		}

		const data = startRes.data as any;
		const { vaultKeyB64 } = await this.crypto.finalizeLogin(
			data.MkWrapPwd,
			data.CryptoSchemaVer,
			data.AccountId || accountId,
		);

		await sendCommand({ type: 'LOGIN_COMPLETE', payload: { vaultKeyB64 } });
		await this.syncStateFromStorage();
	}

	async logout(): Promise<void> {
		await sendCommand({ type: 'LOGOUT' });
		await this.syncStateFromStorage();
	}

	async logoutAll(): Promise<void> {
		await sendCommand({ type: 'LOGOUT_ALL' });
		await this.syncStateFromStorage();
	}

	async wipeAllData(): Promise<void> {
		await sendCommand({ type: 'WIPE_ALL' });
		await this.syncStateFromStorage();
	}

	async refresh(): Promise<void> {
		const res = await sendCommand({ type: 'REFRESH' });
		if (!res.success) throw new Error(res.error);
		await this.syncStateFromStorage();
	}

	async setLockoutStrategy(strategy: string): Promise<void> {
		const oldArea = await StorageCore.detectArea();
		await StorageCore.set(StorageCore.KEYS.LOCKOUT_STRATEGY, strategy);
		const newArea = await StorageCore.detectArea();

		if (oldArea !== newArea && this.isAuthenticated()) {
			const keys = [
				StorageCore.KEYS.ACCESS_TOKEN,
				StorageCore.KEYS.REFRESH_TOKEN,
				StorageCore.KEYS.REFRESH_EXPIRES_AT,
				StorageCore.KEYS.VAULT_KEY,
			];
			const data = await StorageCore.getMultiple(keys, oldArea);
			await StorageCore.setMultiple(data, newArea);
			await StorageCore.removeMultiple(keys, oldArea);
		}

		await this.syncStateFromStorage();
	}

	async checkVaultStatus(): Promise<void> {
		await this.syncStateFromStorage();
	}

	async removeExclusion(domain: string): Promise<void> {
		await sendCommand({ type: 'REMOVE_EXCLUSION', payload: { domain } });
		await this.syncStateFromStorage();
	}
}
