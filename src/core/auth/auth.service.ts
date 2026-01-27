import { Injectable, inject, signal } from '@angular/core';
import {
	AuthApiService,
	ExtLoginResponse,
	ExtRefreshResponse,
} from '../api/auth-api.service';
import {
	BrowserStorageService,
	StorageArea,
} from '../storage/browser-storage.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
	private api = inject(AuthApiService);
	private storage = inject(BrowserStorageService);

	readonly isAuthenticated = signal(false);
	readonly accountId = signal<string | null>(null);

	async init(): Promise<void> {
		console.log('[Vaulton AuthService] Initializing state from storage...');
		const local = await this.storage.getMultiple(
			['AccountId', 'NeverLockout'],
			'local',
		);
		this.accountId.set(local['AccountId'] || null);

		const session = await this.storage.getMultiple(['AccessToken'], 'session');
		if (session['AccessToken']) {
			this.isAuthenticated.set(true);
		} else if (local['NeverLockout'] === true) {
			const tokens = await this.storage.getMultiple(['AccessToken'], 'local');
			if (tokens['AccessToken']) {
				this.isAuthenticated.set(true);
			}
		}
	}

	async login(accountId: string, verifier: string): Promise<ExtLoginResponse> {
		const response = await firstValueFrom(this.api.login(accountId, verifier));
		await this.saveSession(
			response.AccessToken,
			response.RefreshToken,
			response.RefreshExpiresAt,
			accountId,
		);
		this.isAuthenticated.set(true);
		this.accountId.set(accountId);
		return response;
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
		this.isAuthenticated.set(false);
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
