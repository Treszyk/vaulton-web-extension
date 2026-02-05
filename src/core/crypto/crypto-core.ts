import { bytesToB64, b64ToBytes } from './b64';
import { StorageCore } from '../storage/storage-core';
import { zeroize } from './zeroize';
import { encryptSplit } from './aesgcm-split';
import { hkdfAesGcm256Key, hkdfVerifierB64 } from './hkdf';
import { EncryptedValueDto } from './worker/crypto.worker.types';
import { KdfProvider } from './kdf/kdf';

export async function computeLoginVerifier(
	password: Uint8Array,
	saltB64: string,
	kdfMode: number,
	kdfProvider: KdfProvider,
): Promise<{ hkdfBaseKey: CryptoKey; verifier: string }> {
	const sPwd = b64ToBytes(saltB64);
	try {
		const hkdfBaseKey = await kdfProvider.deriveHkdfBaseKey(
			password,
			sPwd,
			kdfMode,
		);
		const verifierB64 = await hkdfVerifierB64(hkdfBaseKey, 'vaulton/verifier');
		return { hkdfBaseKey, verifier: verifierB64 };
	} finally {
		zeroize(sPwd);
	}
}

export async function deriveVaultKeys(
	baseKey: CryptoKey,
	MkWrapPwd: EncryptedValueDto,
	CryptoSchemaVer: number,
	AccountId: string,
): Promise<{
	vaultKey: CryptoKey;
	vaultKeyB64: string;
}> {
	const aadString = `vaulton:mk-wrap-pwd:schema${CryptoSchemaVer}:${AccountId}`;
	const aad = new TextEncoder().encode(aadString);

	try {
		const kekKey = await hkdfAesGcm256Key(baseKey, 'vaulton/kek', [
			'unwrapKey',
		]);

		const mk = await unwrapMk(kekKey, MkWrapPwd, aad);

		const vaultKey = await hkdfAesGcm256Key(
			mk,
			'vaulton/vault-enc',
			['encrypt', 'decrypt'],
			true,
		);

		const vaultKeyRaw = await crypto.subtle.exportKey('raw', vaultKey);

		return {
			vaultKey,
			vaultKeyB64: bytesToB64(new Uint8Array(vaultKeyRaw)),
		};
	} finally {
		zeroize(aad);
	}
}

export async function encryptVaultRecord<T = any>(
	vaultKey: CryptoKey,
	input: T,
	entryId: string,
): Promise<{ Payload: EncryptedValueDto }> {
	const aadStr = `vaulton:v-entry:${entryId}`;
	const aad = b64ToBytes(bytesToB64(new TextEncoder().encode(aadStr)));
	const json = JSON.stringify(input);
	const ptBytes = new Uint8Array(new TextEncoder().encode(json));

	try {
		const split = await encryptSplit(vaultKey, ptBytes, aad);

		try {
			return {
				Payload: {
					Nonce: bytesToB64(split.Nonce),
					CipherText: bytesToB64(split.CipherText),
					Tag: bytesToB64(split.Tag),
				},
			};
		} finally {
			zeroize(split.Nonce);
			zeroize(split.CipherText);
			zeroize(split.Tag);
		}
	} finally {
		try {
			zeroize(ptBytes);
		} catch {}
		try {
			zeroize(aad);
		} catch {}
	}
}

export async function decryptVaultRecord<T = any>(
	vaultKey: CryptoKey,
	dto: EncryptedValueDto,
	entryId: string,
): Promise<T> {
	const aadStr = `vaulton:v-entry:${entryId}`;
	const nonce = b64ToBytes(dto.Nonce);
	const ct = b64ToBytes(dto.CipherText);
	const tag = b64ToBytes(dto.Tag);
	const aad = b64ToBytes(bytesToB64(new TextEncoder().encode(aadStr)));

	let ctTag: Uint8Array | null = null;

	try {
		ctTag = new Uint8Array(ct.length + tag.length);
		ctTag.set(ct, 0);
		ctTag.set(tag, ct.length);

		const ptBuf = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: nonce as BufferSource,
				additionalData: aad as BufferSource,
			},
			vaultKey,
			ctTag as BufferSource,
		);

		const json = new TextDecoder().decode(ptBuf);
		return JSON.parse(json) as T;
	} finally {
		zeroize(nonce);
		zeroize(ct);
		zeroize(tag);
		zeroize(aad);
		if (ctTag) zeroize(ctTag);
	}
}

export async function unwrapMk(
	kek: CryptoKey,
	dto: EncryptedValueDto,
	aad: Uint8Array,
): Promise<CryptoKey> {
	const nonce = b64ToBytes(dto.Nonce);
	const ct = b64ToBytes(dto.CipherText);
	const tag = b64ToBytes(dto.Tag);

	const wrappedBytes = new Uint8Array(ct.length + tag.length);
	wrappedBytes.set(ct, 0);
	wrappedBytes.set(tag, ct.length);

	try {
		return await crypto.subtle.unwrapKey(
			'raw',
			wrappedBytes as BufferSource,
			kek,
			{
				name: 'AES-GCM',
				iv: nonce as BufferSource,
				additionalData: aad as BufferSource,
			},
			{ name: 'HKDF' },
			false,
			['deriveKey'],
		);
	} finally {
		zeroize(nonce);
		zeroize(ct);
		zeroize(tag);
		zeroize(wrappedBytes);
	}
}

export async function decryptMk(
	kek: CryptoKey,
	dto: EncryptedValueDto,
	aad: Uint8Array,
): Promise<Uint8Array> {
	const nonce = b64ToBytes(dto.Nonce);
	const ct = b64ToBytes(dto.CipherText);
	const tag = b64ToBytes(dto.Tag);

	const ctTag = new Uint8Array(ct.length + tag.length);
	ctTag.set(ct, 0);
	ctTag.set(tag, ct.length);

	try {
		const ptBuf = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: nonce as BufferSource,
				additionalData: aad as BufferSource,
			},
			kek,
			ctTag as BufferSource,
		);

		return new Uint8Array(ptBuf);
	} finally {
		zeroize(nonce);
		zeroize(ct);
		zeroize(tag);
		zeroize(ctTag);
	}
}

export async function importVaultKeys(
	vaultKeyB64: string,
): Promise<{ vaultKey: CryptoKey }> {
	let vaultKeyRaw: Uint8Array | null = null;

	try {
		vaultKeyRaw = b64ToBytes(vaultKeyB64);

		const vaultKey = await crypto.subtle.importKey(
			'raw',
			vaultKeyRaw as BufferSource,
			{ name: 'AES-GCM', length: 256 },
			false,
			['encrypt', 'decrypt'],
		);

		return { vaultKey };
	} finally {
		try {
			if (vaultKeyRaw) zeroize(vaultKeyRaw);
		} catch {}
	}
}

export async function encryptVaultCache(
	vaultKey: CryptoKey,
	plaintext: string,
): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ptBytes = new TextEncoder().encode(plaintext);
	const ctBuf = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		vaultKey,
		ptBytes as BufferSource,
	);

	const combined = new Uint8Array(iv.length + ctBuf.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(ctBuf), iv.length);

	try {
		return bytesToB64(combined);
	} finally {
		zeroize(ptBytes);
	}
}

export async function decryptVaultCache(
	vaultKey: CryptoKey,
	combinedB64: string,
): Promise<string> {
	const combined = b64ToBytes(combinedB64);
	const iv = combined.slice(0, 12);
	const ct = combined.slice(12);

	let ptBuf: ArrayBuffer | null = null;
	try {
		ptBuf = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv },
			vaultKey,
			ct as BufferSource,
		);
		return new TextDecoder().decode(ptBuf);
	} finally {
		zeroize(iv);
		zeroize(ct);
		if (ptBuf) {
			new Uint8Array(ptBuf).fill(0);
		}
	}
}

export async function importSessionKey(keyB64: string): Promise<CryptoKey> {
	const raw = b64ToBytes(keyB64);
	try {
		return await crypto.subtle.importKey(
			'raw',
			raw as BufferSource,
			{ name: 'AES-GCM', length: 256 },
			false,
			['encrypt', 'decrypt'],
		);
	} finally {
		zeroize(raw);
	}
}

export async function ensureVaultSessionKey(): Promise<CryptoKey> {
	const stored = await StorageCore.get(
		StorageCore.KEYS.VAULT_SESSION_KEY,
		'session',
	);
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

	await StorageCore.set(StorageCore.KEYS.VAULT_SESSION_KEY, b64, 'session');
	return key;
}
