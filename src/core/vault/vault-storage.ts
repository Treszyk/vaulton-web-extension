import { StorageCore } from '../storage/storage-core';
import {
	importSessionKey,
	decryptVaultCache,
	encryptVaultCache,
	ensureVaultSessionKey,
} from '../crypto/crypto-core';

const LOCAL_VAULT_NAME = StorageCore.KEYS.ENCRYPTED_VAULT;
const SESSION_KEY_NAME = StorageCore.KEYS.VAULT_SESSION_KEY;

export async function loadVault(): Promise<any[]> {
	const vaultEncrypted = await StorageCore.get(LOCAL_VAULT_NAME);
	const sessionKeyB64 = await StorageCore.get(SESSION_KEY_NAME);

	if (!vaultEncrypted || !sessionKeyB64) {
		return [];
	}

	try {
		const sessionKey = await importSessionKey(sessionKeyB64);
		const json = await decryptVaultCache(sessionKey, vaultEncrypted);
		return JSON.parse(json);
	} catch (e) {
		console.error('[VaultStorage] Failed to decrypt stored vault', e);
		return [];
	}
}

export async function saveVault(records: any[]): Promise<void> {
	const sessionKey = await ensureVaultSessionKey();
	const json = JSON.stringify(records);
	const encryptedCache = await encryptVaultCache(sessionKey, json);
	await StorageCore.set(LOCAL_VAULT_NAME, encryptedCache);
}
