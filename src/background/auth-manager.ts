import { StorageCore } from '../core/storage/storage-core';
import {
	importVaultKeys,
	encryptVaultCache,
	decryptVaultCache,
	importSessionKey,
	decryptVaultRecord,
	encryptVaultRecord,
	ensureVaultSessionKey,
} from '../core/crypto/crypto-core';
import { getBaseDomain } from '../core/utils/domain';
import {
	apiLogin,
	apiLogout,
	apiLogoutAll,
	apiAuthMe,
} from '../core/api/auth-api.client';
import { isTokenExpired } from '../core/auth/auth-utils';
import { loadVault, saveVault } from '../core/vault/vault-storage';
import {
	apiCreateEntry,
	apiListEntries,
	apiPreCreateEntry,
	apiUpdateEntry,
} from '../core/api/vault-api.client';

export class BackgroundAuthManager {
	async syncVault(force = false, throttleMs = 300000): Promise<boolean> {
		if (!force) {
			const lastSync = await StorageCore.get(StorageCore.KEYS.LAST_SYNC_TIME);
			if (lastSync && Date.now() - lastSync < throttleMs) {
				console.log('[Background] Sync throttled.');
				return true;
			}
		}

		try {
			const result = await this.trySyncVault();
			if (result) {
				await StorageCore.set(StorageCore.KEYS.LAST_SYNC_TIME, Date.now());
			}
			return result;
		} catch (e) {
			console.error('[Background] Sync failed:', e);
			return false;
		}
	}

	async verifySession(throttleMs = 300000): Promise<boolean> {
		const lastVerify = await StorageCore.get(StorageCore.KEYS.LAST_VERIFY_TIME);
		if (lastVerify && Date.now() - lastVerify < throttleMs) {
			return true;
		}

		try {
			await apiAuthMe();
			await StorageCore.set(StorageCore.KEYS.LAST_VERIFY_TIME, Date.now());
			return true;
		} catch (e) {
			console.warn('[Background] Session verification failed:', e);
			return false;
		}
	}

	private async trySyncVault(): Promise<boolean> {
		const keys = StorageCore.KEYS;
		const storageKeys = await StorageCore.getMultiple([keys.VAULT_KEY]);

		if (!storageKeys[keys.VAULT_KEY]) return false;

		const encryptedEntries = await apiListEntries();

		const { vaultKey } = await importVaultKeys(storageKeys[keys.VAULT_KEY]);

		const decryptedEntries: any[] = [];
		for (const entry of encryptedEntries) {
			try {
				const decrypted = await decryptVaultRecord(
					vaultKey,
					entry.Payload,
					entry.Id,
				);
				decryptedEntries.push({ id: entry.Id, ...decrypted });
			} catch (e) {}
		}

		const sessionKey = await this.ensureSessionKey();
		const encryptedCache = await encryptVaultCache(
			sessionKey,
			JSON.stringify(decryptedEntries),
		);

		await StorageCore.set(keys.ENCRYPTED_VAULT, encryptedCache, 'local');
		return true;
	}

	private async ensureSessionKey(): Promise<CryptoKey> {
		return ensureVaultSessionKey();
	}

	async startLogin(accountId: string, verifier: string): Promise<any> {
		try {
			const data = await apiLogin(accountId, verifier);

			await this.saveSession(
				data.AccessToken,
				data.RefreshToken,
				data.RefreshExpiresAt,
				accountId,
			);

			return {
				success: true,
				MkWrapPwd: data.MkWrapPwd,
				CryptoSchemaVer: data.CryptoSchemaVer || 1,
				AccountId: accountId,
			};
		} catch (e: any) {
			console.error('[Background] Start Login error:', e);
			throw e;
		}
	}

	async completeLogin(vaultKeyB64: string): Promise<boolean> {
		try {
			await StorageCore.setMultiple({
				[StorageCore.KEYS.VAULT_KEY]: vaultKeyB64,
			});
			return true;
		} catch (e) {
			console.error('[Background] Complete Login error:', e);
			return false;
		}
	}

	async refreshTokens(): Promise<boolean> {
		try {
			await apiAuthMe();
			return true;
		} catch (error) {
			console.warn('[BackgroundAuthManager] Proactive refresh failed:', error);
			return false;
		}
	}

	async logout(): Promise<void> {
		const keys = StorageCore.KEYS;
		const { RefreshToken, RefreshExpiresAt } = await StorageCore.getMultiple([
			keys.REFRESH_TOKEN,
			keys.REFRESH_EXPIRES_AT,
		]);

		if (RefreshToken && !isTokenExpired(RefreshExpiresAt)) {
			try {
				await apiLogout(RefreshToken);
			} catch (e) {
				console.warn('[Background] Logout API failed', e);
			}
		}
		await this.clearSession();
	}

	async logoutAll(): Promise<void> {
		try {
			await apiLogoutAll();
		} catch (e) {
			console.warn('[Background] Logout All API failed', e);
		}
		await this.clearSession();
	}

	async wipeAllData(): Promise<void> {
		await this.logout();

		console.log('[Background] Performing TOTAL WIPE of all local data...');
		await StorageCore.clear('local');
		await StorageCore.clear('session');
	}

	public async saveSession(
		accessToken: string,
		refreshToken: string,
		refreshExpiresAt: string,
		accountId?: string,
	): Promise<void> {
		const area = await StorageCore.detectArea();
		const otherArea = area === 'local' ? 'session' : 'local';

		const keys = StorageCore.KEYS;
		const data = {
			[keys.ACCESS_TOKEN]: accessToken,
			[keys.REFRESH_TOKEN]: refreshToken,
			[keys.REFRESH_EXPIRES_AT]: refreshExpiresAt,
		};

		await StorageCore.setMultiple(data, area);
		await StorageCore.removeMultiple(
			[keys.ACCESS_TOKEN, keys.REFRESH_TOKEN, keys.REFRESH_EXPIRES_AT],
			otherArea,
		);

		if (accountId) {
			await StorageCore.set(keys.ACCOUNT_ID, accountId);
		}
	}

	public async clearSession(): Promise<void> {
		console.log('[Background] Clearing session keys and tokens...');
		await StorageCore.clearSession();
	}

	public async resetLockTimer(): Promise<void> {
		const strategy = await StorageCore.get(StorageCore.KEYS.LOCKOUT_STRATEGY);

		await chrome.alarms.clear('auto-lock');

		const minutes = parseInt(strategy);
		if (!isNaN(minutes) && minutes > 0) {
			chrome.alarms.create('auto-lock', { delayInMinutes: minutes });
		}
	}

	public async isLocked(): Promise<boolean> {
		const sessionKey = await StorageCore.get(
			StorageCore.KEYS.VAULT_SESSION_KEY,
		);
		return !sessionKey;
	}

	public async saveAndUploadCredential(
		domain: string,
		username: string,
		password: string,
	): Promise<void> {
		const keys = StorageCore.KEYS;
		const storageKeys = await StorageCore.getMultiple([keys.VAULT_KEY]);
		if (!storageKeys[keys.VAULT_KEY]) {
			throw new Error('Vault keys not available');
		}

		const vault = (await loadVault()) || [];
		const baseDomain = getBaseDomain(domain);
		const existingRecord = vault.find(
			(r: any) =>
				(r.website === baseDomain || r.title === baseDomain) &&
				r.username === username,
		);

		const recordData = {
			title: domain,
			username,
			password,
			website: domain,
			notes: existingRecord?.notes || '',
			createdAt: existingRecord?.createdAt || Date.now(),
			lastModified: Date.now(),
		};

		const { vaultKey } = await importVaultKeys(storageKeys[keys.VAULT_KEY]);
		const entryId = existingRecord
			? existingRecord.id
			: (await apiPreCreateEntry()).EntryId;
		const encrypted = await encryptVaultRecord(vaultKey, recordData, entryId);

		if (existingRecord) {
			await apiUpdateEntry(entryId, { Payload: encrypted.Payload });
		} else {
			await apiCreateEntry({ EntryId: entryId, Payload: encrypted.Payload });
		}

		if (existingRecord) {
			const index = vault.findIndex((r: any) => r.id === entryId);
			if (index !== -1) vault[index] = { ...vault[index], ...recordData };
		} else {
			vault.push({ id: entryId, ...recordData });
		}

		await saveVault(vault);
	}

	public async setPendingSavePrompt(domain: string, data: any): Promise<void> {
		if (await this.isLocked()) return;

		const keys = StorageCore.KEYS;
		const sessionKeyB64 = await StorageCore.get(keys.VAULT_SESSION_KEY);
		if (!sessionKeyB64) return;

		const sessionKey = await importSessionKey(sessionKeyB64);
		const encrypted = await encryptVaultCache(sessionKey, JSON.stringify(data));

		const allPending = (await StorageCore.get(keys.PENDING_SAVE)) || {};
		allPending[domain.toLowerCase()] = encrypted;

		await StorageCore.set(keys.PENDING_SAVE, allPending);
	}

	public async getPendingSavePrompt(domain: string): Promise<any | null> {
		const keys = StorageCore.KEYS;
		const allPending = await StorageCore.get(keys.PENDING_SAVE);
		if (!allPending || !allPending[domain.toLowerCase()]) return null;

		const encrypted = allPending[domain.toLowerCase()];
		const sessionKeyB64 = await StorageCore.get(keys.VAULT_SESSION_KEY);
		if (!sessionKeyB64) return null;

		try {
			const sessionKey = await importSessionKey(sessionKeyB64);
			const decrypted = await decryptVaultCache(sessionKey, encrypted);
			return JSON.parse(decrypted);
		} catch (e) {
			return null;
		}
	}

	public async clearPendingSavePrompt(domain: string): Promise<void> {
		const key = StorageCore.KEYS.PENDING_SAVE;
		const allPending = await StorageCore.get(key);
		if (allPending && allPending[domain.toLowerCase()]) {
			delete allPending[domain.toLowerCase()];
			await StorageCore.set(key, allPending);
		}
	}

	public async addToExclusions(domain: string): Promise<void> {
		const baseDomain = getBaseDomain(domain);
		if (!baseDomain) return;

		const key = StorageCore.KEYS.EXCLUDED_SITES;
		const exclusions: string[] = (await StorageCore.get(key)) || [];

		if (!exclusions.includes(baseDomain)) {
			exclusions.push(baseDomain);
			await StorageCore.set(key, exclusions);
		}
	}

	public async getExclusions(): Promise<string[]> {
		const key = StorageCore.KEYS.EXCLUDED_SITES;
		return (await StorageCore.get(key)) || [];
	}

	public async removeExclusion(domain: string): Promise<void> {
		const baseDomain = getBaseDomain(domain);
		if (!baseDomain) return;

		const key = StorageCore.KEYS.EXCLUDED_SITES;
		const exclusions: string[] = (await StorageCore.get(key)) || [];

		const updated = exclusions.filter((d) => d !== baseDomain);
		if (updated.length !== exclusions.length) {
			await StorageCore.set(key, updated);
		}
	}
}
