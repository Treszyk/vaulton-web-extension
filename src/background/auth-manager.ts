import { API_BASE_URL } from '../config';
import { StorageCore } from '../core/storage/storage-core';
import {
	importVaultKeys,
	decryptVaultEntry,
	encryptVaultCache,
	decryptVaultCache,
	importSessionKey,
} from '../core/crypto/crypto-core';
import { bytesToB64 } from '../core/crypto/b64';

export class BackgroundAuthManager {
	async syncVault(_force = false): Promise<boolean> {
		const result = await this.trySyncVault();
		if (result === 'unauthorized') {
			console.log(
				'[Background] Sync failed (401). Attempting token refresh...',
			);
			const refreshed = await this.refreshTokens();
			if (refreshed) {
				console.log('[Background] Refresh success. Retrying sync...');
				const retry = await this.trySyncVault();
				return retry === true;
			} else {
				console.log('[Background] Refresh failed. Session cleared.');
				return false;
			}
		}
		return result === true;
	}

	private async trySyncVault(): Promise<boolean | 'unauthorized'> {
		const { AccessToken } = await StorageCore.getSmartMultiple(['AccessToken']);
		if (!AccessToken) return false;

		const keys = await StorageCore.getSmartMultiple([
			'VaultKeyB64',
			'TagKeyB64',
		]);

		if (!keys.VaultKeyB64 || !keys.TagKeyB64) return false;

		try {
			const response = await fetch(`${API_BASE_URL}/vault/entries`, {
				headers: {
					Authorization: `Bearer ${AccessToken}`,
					'Cache-Control': 'no-cache',
					Pragma: 'no-cache',
				},
			});

			if (response.status === 401) {
				return 'unauthorized';
			}

			if (!response.ok) return false;

			const encryptedEntries = await response.json();
			const { vaultKey } = await importVaultKeys(
				keys.VaultKeyB64,
				keys.TagKeyB64,
			);

			const decryptedEntries: any[] = [];
			for (const entry of encryptedEntries) {
				try {
					const aadB64 = bytesToB64(new TextEncoder().encode(entry.Id));
					const ptBuffer = await decryptVaultEntry(
						vaultKey,
						entry.Payload,
						aadB64,
					);
					const decrypted = JSON.parse(new TextDecoder().decode(ptBuffer));
					decryptedEntries.push({ id: entry.Id, ...decrypted });
				} catch (e) {
					console.warn(`[Background] Failed to decrypt entry ${entry.Id}`, e);
				}
			}

			// Encrypt for local cache storage using ephemeral session key
			const sessionKey = await this.ensureSessionKey();
			const encryptedCache = await encryptVaultCache(
				sessionKey,
				JSON.stringify(decryptedEntries),
			);

			await StorageCore.set('EncryptedVault', encryptedCache, 'local');
			return true;
		} catch (e) {
			console.error('[Background] Sync error:', e);
			return false;
		}
	}

	private async ensureSessionKey(): Promise<CryptoKey> {
		const stored = await StorageCore.get('VaultSessionKey', 'session');
		if (stored) {
			return importSessionKey(stored);
		}

		const key = await crypto.subtle.generateKey(
			{ name: 'AES-GCM', length: 256 },
			true,
			['encrypt', 'decrypt'],
		);

		const exported = await crypto.subtle.exportKey('raw', key);
		const b64 = bytesToB64(new Uint8Array(exported));

		await StorageCore.set('VaultSessionKey', b64, 'session');
		return key;
	}

	async startLogin(accountId: string, verifier: string): Promise<any> {
		try {
			const response = await fetch(`${API_BASE_URL}/auth/ext/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ AccountId: accountId, Verifier: verifier }),
			});

			if (!response.ok) {
				throw new Error(`Login failed with status ${response.status}`);
			}

			const data = await response.json();

			// Save session tokens immediately
			await this.saveSession(
				data.AccessToken,
				data.RefreshToken,
				data.RefreshExpiresAt,
				accountId,
			);

			return {
				success: true,
				MkWrapPwd: data.MkWrapPwd,
				CryptoSchemaVer: data.CryptoSchemaVer || 1, // Default if missing
				AccountId: accountId,
			};
		} catch (e: any) {
			console.error('[Background] Start Login error:', e);
			throw e;
		}
	}

	async completeLogin(
		vaultKeyB64: string,
		tagKeyB64: string,
	): Promise<boolean> {
		try {
			await StorageCore.setSmartMultiple({
				VaultKeyB64: vaultKeyB64,
				TagKeyB64: tagKeyB64,
			});
			return true;
		} catch (e) {
			console.error('[Background] Complete Login error:', e);
			return false;
		}
	}

	async refreshTokens(): Promise<boolean> {
		const { RefreshToken, RefreshExpiresAt, VaultKeyB64 } =
			await StorageCore.getSmartMultiple([
				'RefreshToken',
				'RefreshExpiresAt',
				'VaultKeyB64',
			]);

		if (!RefreshToken) {
			if (VaultKeyB64) {
				await this.clearSession();
			}
			return false;
		}

		if (this.isTokenExpired(RefreshExpiresAt)) {
			await this.clearSession();
			return false;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/auth/ext/refresh`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ RefreshToken: RefreshToken }),
			});

			if (!response.ok) {
				if (
					response.status === 400 ||
					response.status === 401 ||
					response.status === 403
				) {
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

	async logout(): Promise<void> {
		const { RefreshToken, RefreshExpiresAt } =
			await StorageCore.getSmartMultiple(['RefreshToken', 'RefreshExpiresAt']);

		if (RefreshToken && !this.isTokenExpired(RefreshExpiresAt)) {
			try {
				await fetch(`${API_BASE_URL}/auth/ext/logout`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ RefreshToken: RefreshToken }),
				});
			} catch (e) {
				console.warn('[Background] Logout fetch failed', e);
			}
		}
		await this.clearSession();
	}

	private isTokenExpired(expiresAt: string | null): boolean {
		if (!expiresAt) return true;
		const expiry = new Date(expiresAt).getTime();
		return Date.now() >= expiry - 30000;
	}

	public async saveSession(
		accessToken: string,
		refreshToken: string,
		refreshExpiresAt: string,
		accountId?: string,
	): Promise<void> {
		const area = await StorageCore.detectArea();
		const otherArea = area === 'local' ? 'session' : 'local';

		const data = {
			AccessToken: accessToken,
			RefreshToken: refreshToken,
			RefreshExpiresAt: refreshExpiresAt,
		};

		await StorageCore.setMultiple(data, area);
		await StorageCore.removeMultiple(
			['AccessToken', 'RefreshToken', 'RefreshExpiresAt'],
			otherArea,
		);

		if (accountId) {
			await StorageCore.set('AccountId', accountId, 'local');
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
		console.log('[Background] Clearing session keys and tokens...');
		await StorageCore.removeMultiple(keys, 'session');
		await StorageCore.removeMultiple(keys, 'local');
	}

	public async resetLockTimer(): Promise<void> {
		const strategy = await StorageCore.get('LockoutStrategy', 'local');

		await chrome.alarms.clear('auto-lock');

		const minutes = parseInt(strategy);
		if (!isNaN(minutes) && minutes > 0) {
			chrome.alarms.create('auto-lock', { delayInMinutes: minutes });
			console.log(`[Background] Auto-lock timer reset: ${minutes} minutes`);
		}
	}

	public async getDecryptedVault(): Promise<any[]> {
		const encryptedVault = await StorageCore.get('EncryptedVault', 'local');
		if (!encryptedVault) return [];

		const sessionKeyB64 = await StorageCore.get('VaultSessionKey', 'session');
		if (!sessionKeyB64) return [];

		try {
			const sessionKey = await importSessionKey(sessionKeyB64);
			const vaultJson = await decryptVaultCache(sessionKey, encryptedVault);
			return JSON.parse(vaultJson);
		} catch (e) {
			console.error('[Background] Failed to decrypt vault:', e);
			return [];
		}
	}
}
