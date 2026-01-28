import { API_BASE_URL } from '../config';
import { StorageCore } from '../core/storage/storage-core';

export class BackgroundAuthManager {
	async syncVault(): Promise<boolean> {
		const tokens = await this.getTokens();
		if (!tokens.accessToken) return false;

		const keys = await StorageCore.getMultiple(
			['VaultKeyB64', 'TagKeyB64'],
			'session',
		);
		const sessionKeyB64 = await StorageCore.get('VaultSessionKey', 'session');

		if (!keys.VaultKeyB64 || !sessionKeyB64) return false;

		try {
			// currently background sync is impossible due to problems with spwaning the crypto worker, needs refactoring
			// CHANGE THIS HERE!!! ONLY MANUAL REFRESH WORKS!!!!
			const response = await fetch(`${API_BASE_URL}/vault/entries`, {
				headers: { Authorization: `Bearer ${tokens.accessToken}` },
			});
			if (!response.ok) return false;
			const encryptedEntries = await response.json();

			return true;
		} catch {
			return false;
		}
	}

	async refreshTokens(): Promise<boolean> {
		const tokens = await this.getTokens();
		if (!tokens.refreshToken) {
			return false;
		}

		if (this.isTokenExpired(tokens.refreshExpiresAt)) {
			await this.clearSession();
			return false;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/auth/ext/refresh`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ RefreshToken: tokens.refreshToken }),
			});

			if (!response.ok) {
				if (response.status === 401) {
					await this.clearSession();
				}
				return false;
			}

			const data = await response.json();
			await this.saveSession(
				data.AccessToken,
				data.RefreshToken,
				data.RefreshExpiresAt,
			);
			return true;
		} catch (error) {
			console.error('[BackgroundAuthManager] Refresh error:', error);
			return false;
		}
	}

	private isTokenExpired(expiresAt: string | null): boolean {
		if (!expiresAt) return true;
		const expiry = new Date(expiresAt).getTime();
		return Date.now() >= expiry - 30000;
	}

	private async getTokens(): Promise<{
		accessToken: string | null;
		refreshToken: string | null;
		refreshExpiresAt: string | null;
	}> {
		const local = await StorageCore.getMultiple(
			['NeverLockout', 'AccessToken', 'RefreshToken', 'RefreshExpiresAt'],
			'local',
		);

		if (local?.NeverLockout === true) {
			return {
				accessToken: local.AccessToken || null,
				refreshToken: local.RefreshToken || null,
				refreshExpiresAt: local.RefreshExpiresAt || null,
			};
		}

		const session = await StorageCore.getMultiple(
			['AccessToken', 'RefreshToken', 'RefreshExpiresAt'],
			'session',
		);

		return {
			accessToken: session?.AccessToken || null,
			refreshToken: session?.RefreshToken || null,
			refreshExpiresAt: session?.RefreshExpiresAt || null,
		};
	}

	private async saveSession(
		accessToken: string,
		refreshToken: string,
		refreshExpiresAt: string,
	): Promise<void> {
		const neverLockout = await StorageCore.get('NeverLockout', 'local');
		const data = {
			AccessToken: accessToken,
			RefreshToken: refreshToken,
			RefreshExpiresAt: refreshExpiresAt,
		};

		if (neverLockout === true) {
			await StorageCore.setMultiple(data, 'local');
		} else {
			await StorageCore.setMultiple(data, 'session');
		}
	}

	public async clearSession(): Promise<void> {
		const keys = [
			'AccessToken',
			'RefreshToken',
			'RefreshExpiresAt',
			'VaultKeyB64',
			'TagKeyB64',
			'VaultSessionKey',
			'EncryptedVault',
		];
		await StorageCore.removeMultiple(keys, 'session');
		await StorageCore.removeMultiple(keys, 'local');
	}
}
