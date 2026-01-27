import { Injectable, inject, signal } from '@angular/core';
import { AuthApiService, ExtRefreshResponse } from '../api/auth-api.service';
import {
	BrowserStorageService,
	StorageArea,
} from '../storage/browser-storage.service';
import { AuthCryptoService } from './auth-crypto.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SessionService {
	private api = inject(AuthApiService);
	private storage = inject(BrowserStorageService);
	private crypto = inject(AuthCryptoService);

	readonly isAuthenticated = signal(false);
	readonly accountId = signal<string | null>(null);
	readonly isLocked = signal(true);
	readonly neverLockout = signal(false);

	async tryRestore(): Promise<void> {
		const local = await this.storage.getMultiple(
			['AccountId', 'NeverLockout'],
			'local',
		);
		this.accountId.set(local['AccountId'] || null);
		this.neverLockout.set(local['NeverLockout'] === true);

		const tokens = await this.getTokens();
		if (tokens.accessToken) {
			this.isAuthenticated.set(true);
			await this.checkVaultStatus();

			try {
				await firstValueFrom(this.api.me());
			} catch (e) {
				await this.logout();
			}
			return;
		}

		if (tokens.refreshToken) {
			if (this.isTokenExpired(tokens.refreshExpiresAt)) {
				await this.logout();
				return;
			}

			console.log(
				'[Vaulton SessionService] Recovering session from refresh token...',
			);
			try {
				await this.refresh();
				this.isAuthenticated.set(true);
				await this.checkVaultStatus();
				console.log('[Vaulton SessionService] Session recovered');
			} catch (e) {
				console.warn('[Vaulton SessionService] Recovery failed', e);
				await this.logout();
			}
		}
	}

	async login(accountId: string, password: string): Promise<void> {
		const preLogin = await firstValueFrom(this.api.preLogin(accountId));

		const { verifier } = await this.crypto.buildLogin(password, preLogin);

		const response = await firstValueFrom(this.api.login(accountId, verifier));

		await this.crypto.finalizeLogin(
			response.MkWrapPwd,
			preLogin.CryptoSchemaVer,
			accountId,
		);

		await this.saveSession(
			response.AccessToken,
			response.RefreshToken,
			response.RefreshExpiresAt,
			accountId,
		);

		this.isAuthenticated.set(true);
		this.accountId.set(accountId);
		this.isLocked.set(false);
	}

	async toggleNeverLockout(value: boolean): Promise<void> {
		this.neverLockout.set(value);
		await this.storage.set('NeverLockout', value, 'local');

		if (this.isAuthenticated()) {
			const tokens = await this.getTokens();
			if (tokens.accessToken) {
				await this.saveSession(
					tokens.accessToken,
					tokens.refreshToken || '',
					tokens.refreshExpiresAt || '',
				);

				const source = value ? 'session' : 'local';
				const target = value ? 'local' : 'session';
				const keys = await this.storage.getMultiple(
					['VaultKeyB64', 'TagKeyB64'],
					source,
				);

				if (keys['VaultKeyB64']) {
					await this.storage.setMultiple(keys, target);
					await this.storage.removeMultiple(
						['VaultKeyB64', 'TagKeyB64'],
						source,
					);
				}
			}
		}
	}

	async checkVaultStatus(): Promise<void> {
		const locked = !(await this.crypto.checkStatus());
		this.isLocked.set(locked);
	}

	async refresh(): Promise<ExtRefreshResponse> {
		const tokens = await this.getTokens();
		if (!tokens.refreshToken) throw new Error('No refresh token available');

		if (this.isTokenExpired(tokens.refreshExpiresAt)) {
			await this.logout();
			throw new Error('Refresh token expired');
		}

		const response = await firstValueFrom(
			this.api.refresh(tokens.refreshToken),
		);
		await this.saveSession(
			response.AccessToken,
			response.RefreshToken,
			response.RefreshExpiresAt,
		);
		return response;
	}

	isTokenExpired(expiresAt: string | null): boolean {
		if (!expiresAt) return true;
		const expiry = new Date(expiresAt).getTime();
		return Date.now() >= expiry;
	}

	async logout(): Promise<void> {
		const tokens = await this.getTokens();
		if (tokens.refreshToken && !this.isTokenExpired(tokens.refreshExpiresAt)) {
			try {
				await firstValueFrom(this.api.logout(tokens.refreshToken));
			} catch (e) {
				console.warn('Logout failed on backend', e);
			}
		}
		await this.clearSession();
		await this.crypto.clearKeys();
		this.isAuthenticated.set(false);
		this.isLocked.set(true);
	}

	private async getTokens(): Promise<{
		accessToken: string | null;
		refreshToken: string | null;
		refreshExpiresAt: string | null;
	}> {
		const local = await this.storage.getMultiple(['NeverLockout'], 'local');
		const area: StorageArea =
			local['NeverLockout'] === true ? 'local' : 'session';

		const data = await this.storage.getMultiple(
			['AccessToken', 'RefreshToken', 'RefreshExpiresAt'],
			area,
		);
		return {
			accessToken: data['AccessToken'] || null,
			refreshToken: data['RefreshToken'] || null,
			refreshExpiresAt: data['RefreshExpiresAt'] || null,
		};
	}

	private async saveSession(
		accessToken: string,
		refreshToken: string,
		refreshExpiresAt: string,
		accountId?: string,
	): Promise<void> {
		const local = await this.storage.getMultiple(['NeverLockout'], 'local');
		const neverLockout = local['NeverLockout'] === true;

		const data: any = {
			AccessToken: accessToken,
			RefreshToken: refreshToken,
			RefreshExpiresAt: refreshExpiresAt,
		};

		if (neverLockout) {
			await this.storage.setMultiple(data, 'local');
			await this.storage.removeMultiple(
				['AccessToken', 'RefreshToken', 'RefreshExpiresAt'],
				'session',
			);
		} else {
			await this.storage.setMultiple(data, 'session');
			await this.storage.removeMultiple(
				['AccessToken', 'RefreshToken', 'RefreshExpiresAt'],
				'local',
			);
		}

		if (accountId) {
			await this.storage.set('AccountId', accountId, 'local');
		}
	}

	private async clearSession(): Promise<void> {
		await this.storage.removeMultiple(
			['AccessToken', 'RefreshToken', 'RefreshExpiresAt'],
			'session',
		);
		await this.storage.removeMultiple(
			['AccessToken', 'RefreshToken', 'RefreshExpiresAt'],
			'local',
		);
	}
}
