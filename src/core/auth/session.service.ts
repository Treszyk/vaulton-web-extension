import { Injectable, inject, signal } from '@angular/core';
import { AuthApiService } from '../api/auth-api.service';
import { BrowserStorageService } from '../storage/browser-storage.service';
import { StorageCore } from '../storage/storage-core';
import { AuthCryptoService } from './auth-crypto.service';
import { firstValueFrom } from 'rxjs';
import { BackgroundAction, BackgroundResponse } from '../messaging';

@Injectable({ providedIn: 'root' })
export class SessionService {
	private api = inject(AuthApiService);
	private storage = inject(BrowserStorageService);
	private crypto = inject(AuthCryptoService);

	readonly isAuthenticated = signal(false);
	readonly accountId = signal<string | null>(null);
	readonly isLocked = signal(true);
	readonly lockoutStrategy = signal<string>('OnQuit');

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
		const local = await this.storage.getMultiple(
			['AccountId', 'LockoutStrategy'],
			'local',
		);
		this.accountId.set(local['AccountId'] || null);
		this.lockoutStrategy.set(local['LockoutStrategy'] || 'OnQuit');

		const data = await this.storage.getSmartMultiple([
			'AccessToken',
			'VaultKeyB64',
		]);

		this.isAuthenticated.set(!!data['AccessToken']);
		this.isLocked.set(!data['VaultKeyB64']);
	}

	async tryRestore(): Promise<void> {
		await this.syncStateFromStorage();
		if (this.isAuthenticated()) {
			try {
				await firstValueFrom(this.api.me());
			} catch (e) {
				await this.logout();
			}
		}
	}

	async login(accountId: string, password: string): Promise<void> {
		const preLogin = await firstValueFrom(this.api.preLogin(accountId));

		const { verifier } = await this.crypto.buildLogin(password, preLogin);

		const startRes = await this.sendCommand({
			type: 'LOGIN_START',
			payload: {
				accountId,
				verifier,
			},
		});

		if (!startRes.success || !startRes.data) {
			throw new Error(startRes.error || 'Login start failed');
		}

		const { vaultKeyB64 } = await this.crypto.finalizeLogin(
			startRes.data.MkWrapPwd,
			startRes.data.CryptoSchemaVer,
			startRes.data.AccountId,
		);

		const completeRes = await this.sendCommand({
			type: 'LOGIN_COMPLETE',
			payload: {
				vaultKeyB64,
			},
		});

		if (!completeRes.success) {
			throw new Error(completeRes.error || 'Login completion failed');
		}

		await this.syncStateFromStorage();
	}

	async logout(): Promise<void> {
		await this.sendCommand({ type: 'LOGOUT' });
		await this.syncStateFromStorage();
	}

	async refresh(): Promise<void> {
		const res = await this.sendCommand({ type: 'REFRESH' });
		if (!res.success) throw new Error(res.error);
		await this.syncStateFromStorage();
	}

	async setLockoutStrategy(strategy: string): Promise<void> {
		const oldArea = await StorageCore.detectArea();
		await this.storage.set('LockoutStrategy', strategy, 'local');
		const newArea = await StorageCore.detectArea();

		if (oldArea !== newArea && this.isAuthenticated()) {
			const keys = [
				'AccessToken',
				'RefreshToken',
				'RefreshExpiresAt',
				'VaultKeyB64',
			];
			const data = await this.storage.getMultiple(keys, oldArea);
			await this.storage.setMultiple(data, newArea);
			await this.storage.removeMultiple(keys, oldArea);
		}

		await this.syncStateFromStorage();
	}

	async checkVaultStatus(): Promise<void> {
		await this.syncStateFromStorage();
	}

	private sendCommand(action: BackgroundAction): Promise<BackgroundResponse> {
		return new Promise((resolve) => {
			chrome.runtime.sendMessage(action, (res) => resolve(res));
		});
	}
}
