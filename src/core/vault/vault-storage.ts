import { StorageCore } from '../storage/storage-core';
import {
	importSessionKey,
	decryptVaultCache,
	encryptVaultCache,
} from '../crypto/crypto-core';
import { bytesToB64 } from '../crypto/b64';

const LOCAL_VAULT_NAME = 'EncryptedVault';
const SESSION_KEY_NAME = 'VaultSessionKey';

export async function loadVault(): Promise<any[]> {
	const vaultEncrypted = await StorageCore.get(LOCAL_VAULT_NAME, 'local');
	const sessionKeyB64 = await StorageCore.get(SESSION_KEY_NAME, 'session');

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
	let sessionKeyB64 = await StorageCore.get(SESSION_KEY_NAME, 'session');
	let sessionKey: CryptoKey;

	if (!sessionKeyB64) {
		sessionKey = await crypto.subtle.generateKey(
			{ name: 'AES-GCM', length: 256 },
			true,
			['encrypt', 'decrypt'],
		);
		const raw = await crypto.subtle.exportKey('raw', sessionKey);
		const b64 = bytesToB64(new Uint8Array(raw));
		await StorageCore.set(SESSION_KEY_NAME, b64, 'session');

		sessionKey = await importSessionKey(b64);
	} else {
		sessionKey = await importSessionKey(sessionKeyB64);
	}

	const json = JSON.stringify(records);
	const encryptedCache = await encryptVaultCache(sessionKey, json);
	await StorageCore.set(LOCAL_VAULT_NAME, encryptedCache, 'local');
}
