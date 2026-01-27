/// <reference lib="webworker" />

import { bytesToB64, b64ToBytes } from '../b64';
import { zeroize } from '../zeroize';
import { encryptSplit } from '../aesgcm-split';
import { hkdfAesGcm256Key, hkdfHmacSha256Key, hkdfVerifierB64 } from '../hkdf';
import { Argon2KdfProvider } from '../kdf/argon2-kdf';
import type {
	WorkerRequest,
	WorkerMessage,
	WorkerResponseEnvelope,
	EncryptedValueDto,
} from './crypto.worker.types';
import type { KdfProvider } from '../kdf/kdf';

const kdfProvider: KdfProvider = new Argon2KdfProvider();
let vaultKey: CryptoKey | null = null;
let domainTagKey: CryptoKey | null = null;
let pendingLoginBaseKey: CryptoKey | null = null;

addEventListener(
	'message',
	async ({ data }: MessageEvent<WorkerMessage<WorkerRequest>>) => {
		const { id, payload: request } = data;

		try {
			switch (request.type) {
				case 'LOGIN': {
					const { passwordBuffer } = request.payload;
					const pwdBytes = new Uint8Array(passwordBuffer);
					try {
						const res = await handleLogin({
							...request.payload,
							password: pwdBytes,
						});
						postSuccess(id, res);
					} finally {
						zeroize(pwdBytes);
					}
					break;
				}
				case 'FINALIZE_LOGIN': {
					await handleFinalizeLogin(request.payload);
					postSuccess(id, { ok: true });
					break;
				}
				case 'CLEAR_KEYS': {
					await handleClearKeys();
					postSuccess(id, { ok: true });
					break;
				}
				case 'CHECK_STATUS': {
					const isUnlocked = !!vaultKey;
					postSuccess(id, { isUnlocked });
					break;
				}
				case 'UNLOCK': {
					const { passwordBuffer } = request.payload;
					const pwdBytes = new Uint8Array(passwordBuffer);
					try {
						await handleLogin({ ...request.payload, password: pwdBytes });
						await handleFinalizeLogin(request.payload as any);
						postSuccess(id, { ok: true });
					} finally {
						zeroize(pwdBytes);
					}
					break;
				}
				case 'ENCRYPT_ENTRY': {
					const { result } = await handleEncryptEntry(request.payload);
					postSuccess(id, result);
					break;
				}
				case 'DECRYPT_ENTRY': {
					const { result, transfer } = await handleDecryptEntry(
						request.payload,
					);
					postSuccess(id, result, transfer);
					break;
				}
				case 'BENCHMARK_KDF': {
					const { passwordBuffer, saltBuffer, kdfMode } = request.payload;
					const pwdBytes = new Uint8Array(passwordBuffer);
					const saltBytes = new Uint8Array(saltBuffer);
					try {
						const duration = await kdfProvider.benchmark(
							pwdBytes,
							saltBytes,
							kdfMode,
						);
						postSuccess(id, { duration });
					} finally {
						zeroize(pwdBytes);
						zeroize(saltBytes);
					}
					break;
				}
				case 'ACTIVATE_PASSCODE': {
					const {
						passwordBuffer,
						passcodeBuffer,
						masterSaltB64,
						masterKdfMode,
						accountId,
						mkWrapPwd,
						schemaVer,
					} = request.payload;
					const pwdBytes = new Uint8Array(passwordBuffer);
					const pinBytes = new Uint8Array(passcodeBuffer);
					try {
						const res = await handleActivatePasscode({
							password: pwdBytes,
							masterSaltB64,
							masterKdfMode,
							passcode: pinBytes,
							accountId,
							mkWrapPwd,
							schemaVer,
						});
						postSuccess(id, res);
					} finally {
						zeroize(pwdBytes);
						zeroize(pinBytes);
					}
					break;
				}
				case 'UNLOCK_VIA_PASSCODE': {
					const { passcodeBuffer, saltB64, mkWrapLocal, accountId } =
						request.payload;
					const pinBytes = new Uint8Array(passcodeBuffer);
					try {
						await handleUnlockViaPasscode({
							passcode: pinBytes,
							saltB64,
							mkWrapLocal,
							accountId,
						});
						postSuccess(id, { ok: true });
					} finally {
						zeroize(pinBytes);
					}
					break;
				}
				default:
					throw new Error(`Unknown message type: ${(request as any).type}`);
			}
		} catch (err: any) {
			postError(id, err.message || String(err));
		}
	},
);

function postSuccess<T>(id: string, result: T, transfer?: Transferable[]) {
	const msg: WorkerResponseEnvelope<T> = { id, ok: true, result };
	postMessage(msg, transfer ?? []);
}

function postError(id: string, error: string) {
	const msg: WorkerResponseEnvelope<any> = { id, ok: false, error };
	postMessage(msg);
}

async function handleLogin({
	password,
	saltB64,
	kdfMode,
}: {
	password: Uint8Array;
	saltB64: string;
	kdfMode: number;
}) {
	const sPwd = b64ToBytes(saltB64);

	if (pendingLoginBaseKey) {
		pendingLoginBaseKey = null;
	}

	try {
		const hkdfBaseKey = await kdfProvider.deriveHkdfBaseKey(
			password,
			sPwd,
			kdfMode,
		);

		pendingLoginBaseKey = hkdfBaseKey;

		const verifierB64 = await hkdfVerifierB64(hkdfBaseKey, 'vaulton/verifier');
		return { verifier: verifierB64 };
	} catch (e) {
		pendingLoginBaseKey = null;
		throw e;
	} finally {
		zeroize(sPwd);
	}
}

async function handleFinalizeLogin({
	MkWrapPwd,
	CryptoSchemaVer,
	AccountId,
}: {
	MkWrapPwd: EncryptedValueDto;
	CryptoSchemaVer: number;
	AccountId: string;
}) {
	if (!pendingLoginBaseKey) {
		throw new Error('No pending login key found. Please login again.');
	}

	vaultKey = null;
	domainTagKey = null;

	const aadString = `vaulton:mk-wrap-pwd:schema${CryptoSchemaVer}:${AccountId}`;
	const aad = new TextEncoder().encode(aadString);

	try {
		const kekKey = await hkdfAesGcm256Key(pendingLoginBaseKey, 'vaulton/kek', [
			'unwrapKey',
		]);

		const mk = await unwrapMk(kekKey, MkWrapPwd, aad);

		vaultKey = await hkdfAesGcm256Key(mk, 'vaulton/vault-enc', [
			'encrypt',
			'decrypt',
		]);
		domainTagKey = await hkdfHmacSha256Key(mk, 'vaulton/vault-tag');
	} catch (e) {
		vaultKey = null;
		domainTagKey = null;
		throw e;
	} finally {
		pendingLoginBaseKey = null;
		zeroize(aad);
	}
}

async function handleClearKeys() {
	vaultKey = null;
	domainTagKey = null;
	pendingLoginBaseKey = null;
}

async function handleEncryptEntry({
	plaintextBuffer,
	aadB64,
	domain,
}: {
	plaintextBuffer: ArrayBuffer;
	aadB64: string;
	domain?: string;
}) {
	if (!vaultKey || !domainTagKey) throw new Error('Vault key not initialized');

	const ptBytes = new Uint8Array(plaintextBuffer);
	const aad = b64ToBytes(aadB64);

	try {
		const split = await encryptSplit(vaultKey, ptBytes, aad);

		const domainInput = domain ?? '';
		const domainBytes = new TextEncoder().encode(domainInput);
		let domainTag = '';

		try {
			const hmacBuf = await crypto.subtle.sign(
				{ name: 'HMAC' },
				domainTagKey,
				domainBytes,
			);
			const hmacBytes = new Uint8Array(hmacBuf);
			try {
				domainTag = bytesToB64(hmacBytes);
			} finally {
				zeroize(hmacBytes);
			}
		} finally {
			zeroize(domainBytes);
		}

		try {
			return {
				result: {
					DomainTag: domainTag,
					Payload: {
						Nonce: bytesToB64(split.Nonce),
						CipherText: bytesToB64(split.CipherText),
						Tag: bytesToB64(split.Tag),
					},
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

async function handleDecryptEntry({
	dto,
	aadB64,
}: {
	dto: EncryptedValueDto;
	aadB64: string;
}) {
	if (!vaultKey) throw new Error('Vault key not initialized');

	const nonce = b64ToBytes(dto.Nonce);
	const ct = b64ToBytes(dto.CipherText);
	const tag = b64ToBytes(dto.Tag);
	const aad = b64ToBytes(aadB64);

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

		return { result: { ptBuffer: ptBuf }, transfer: [ptBuf] };
	} finally {
		zeroize(nonce);
		zeroize(ct);
		zeroize(tag);
		zeroize(aad);
		if (ctTag) zeroize(ctTag);
	}
}

async function handleActivatePasscode({
	password,
	masterSaltB64,
	masterKdfMode,
	passcode,
	accountId,
	mkWrapPwd,
	schemaVer,
}: {
	password: Uint8Array;
	masterSaltB64: string;
	masterKdfMode: number;
	passcode: Uint8Array;
	accountId: string;
	mkWrapPwd: EncryptedValueDto;
	schemaVer: number;
}) {
	const mSalt = b64ToBytes(masterSaltB64);
	const localSalt = crypto.getRandomValues(new Uint8Array(16));
	const aadLocal = new TextEncoder().encode(
		`vaulton:local-passcode-wrap:${accountId}`,
	);
	const aadMaster = new TextEncoder().encode(
		`vaulton:mk-wrap-pwd:schema${schemaVer}:${accountId}`,
	);

	try {
		const hkdfLocal = await kdfProvider.deriveHkdfBaseKey(
			passcode,
			localSalt,
			3,
		);
		const kekLocal = await hkdfAesGcm256Key(hkdfLocal, 'vaulton/kek', [
			'encrypt',
		]);

		const hkdfMaster = await kdfProvider.deriveHkdfBaseKey(
			password,
			mSalt,
			masterKdfMode,
		);
		const kekMaster = await hkdfAesGcm256Key(hkdfMaster, 'vaulton/kek', [
			'decrypt',
		]);

		const mkRaw = await decryptMk(kekMaster, mkWrapPwd, aadMaster);
		const wrap = await encryptSplit(kekLocal, mkRaw, aadLocal);
		zeroize(mkRaw);

		return {
			mkWrapLocal: {
				Nonce: bytesToB64(wrap.Nonce),
				CipherText: bytesToB64(wrap.CipherText),
				Tag: bytesToB64(wrap.Tag),
			},
			sLocalB64: bytesToB64(localSalt),
		};
	} finally {
		zeroize(mSalt);
		zeroize(localSalt);
		zeroize(aadLocal);
		zeroize(aadMaster);
	}
}

async function handleUnlockViaPasscode({
	passcode,
	saltB64,
	mkWrapLocal,
	accountId,
}: {
	passcode: Uint8Array;
	saltB64: string;
	mkWrapLocal: EncryptedValueDto;
	accountId: string;
}) {
	const sLocal = b64ToBytes(saltB64);
	const aadLocal = new TextEncoder().encode(
		`vaulton:local-passcode-wrap:${accountId}`,
	);
	vaultKey = null;
	domainTagKey = null;

	try {
		const hkdfBaseKey = await kdfProvider.deriveHkdfBaseKey(
			passcode,
			sLocal,
			3,
		);

		const kekKey = await hkdfAesGcm256Key(hkdfBaseKey, 'vaulton/kek', [
			'unwrapKey',
		]);
		const mk = await unwrapMk(kekKey, mkWrapLocal, aadLocal);

		vaultKey = await hkdfAesGcm256Key(mk, 'vaulton/vault-enc', [
			'encrypt',
			'decrypt',
		]);
		domainTagKey = await hkdfHmacSha256Key(mk, 'vaulton/vault-tag');
	} catch (e) {
		vaultKey = null;
		domainTagKey = null;
		throw e;
	} finally {
		zeroize(sLocal);
	}
}

async function unwrapMk(
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

async function decryptMk(
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
