import { Injectable, inject, signal } from '@angular/core';
import { AuthApiService } from '../api/auth-api.service';
import { BrowserStorageService } from '../storage/browser-storage.service';
import { StorageArea } from '../storage/storage-core';
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
	readonly neverLockout = signal(false);

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
			['AccountId', 'NeverLockout'],
			'local',
		);
		this.accountId.set(local['AccountId'] || null);
		this.neverLockout.set(local['NeverLockout'] === true);

		const activeArea: StorageArea =
			local['NeverLockout'] === true ? 'local' : 'session';
		const data = await this.storage.getMultiple(
			['AccessToken', 'VaultKeyB64'],
			activeArea,
		);

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

		const { vaultKeyB64, tagKeyB64 } = await this.crypto.finalizeLogin(
			startRes.data.MkWrapPwd,
			startRes.data.CryptoSchemaVer,
			startRes.data.AccountId,
		);

		const completeRes = await this.sendCommand({
			type: 'LOGIN_COMPLETE',
			payload: {
				vaultKeyB64,
				tagKeyB64,
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

	async toggleNeverLockout(value: boolean): Promise<void> {
		await this.storage.set('NeverLockout', value, 'local');
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
