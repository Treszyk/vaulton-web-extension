/// <reference lib="webworker" />

import { zeroize } from '../zeroize';
import { Argon2KdfProvider } from '../kdf/argon2-kdf';
import {
	computeLoginVerifier,
	deriveVaultKeys,
	importVaultKeys,
} from '../crypto-core';
import type {
	WorkerRequest,
	WorkerMessage,
	WorkerResponseEnvelope,
} from './crypto.worker.types';
import type { KdfProvider } from '../kdf/kdf';

const kdfProvider: KdfProvider = new Argon2KdfProvider();
let vaultKey: CryptoKey | null = null;
let pendingLoginBaseKey: CryptoKey | null = null;

addEventListener(
	'message',
	async ({ data }: MessageEvent<WorkerMessage<WorkerRequest>>) => {
		const { id, payload: request } = data;

		try {
			switch (request.type) {
				case 'LOGIN': {
					const { passwordBuffer, saltB64, kdfMode } = request.payload;
					const pwdBytes = new Uint8Array(passwordBuffer);
					try {
						const { hkdfBaseKey, verifier } = await computeLoginVerifier(
							pwdBytes,
							saltB64,
							kdfMode,
							kdfProvider,
						);
						pendingLoginBaseKey = hkdfBaseKey;
						postSuccess(id, { verifier });
					} finally {
						zeroize(pwdBytes);
					}
					break;
				}
				case 'FINALIZE_LOGIN': {
					if (!pendingLoginBaseKey) {
						throw new Error('No pending login key found.');
					}
					const { MkWrapPwd, CryptoSchemaVer, AccountId } = request.payload;
					const res = await deriveVaultKeys(
						pendingLoginBaseKey,
						MkWrapPwd,
						CryptoSchemaVer,
						AccountId,
					);
					vaultKey = res.vaultKey;
					pendingLoginBaseKey = null;
					postSuccess(id, {
						ok: true,
						vaultKeyB64: res.vaultKeyB64,
					});
					break;
				}
				case 'CLEAR_KEYS': {
					vaultKey = null;
					pendingLoginBaseKey = null;
					postSuccess(id, { ok: true });
					break;
				}
				case 'CHECK_STATUS': {
					postSuccess(id, { isUnlocked: !!vaultKey });
					break;
				}
				case 'UNLOCK': {
					const {
						passwordBuffer,
						saltB64,
						kdfMode,
						MkWrapPwd,
						CryptoSchemaVer,
						AccountId,
					} = request.payload;
					const pwdBytes = new Uint8Array(passwordBuffer);
					try {
						const { hkdfBaseKey } = await computeLoginVerifier(
							pwdBytes,
							saltB64,
							kdfMode,
							kdfProvider,
						);
						const res = await deriveVaultKeys(
							hkdfBaseKey,
							MkWrapPwd,
							CryptoSchemaVer,
							AccountId,
						);
						vaultKey = res.vaultKey;
						postSuccess(id, { ok: true, vaultKeyB64: res.vaultKeyB64 });
					} finally {
						zeroize(pwdBytes);
					}
					break;
				}
				case 'IMPORT_KEYS': {
					const { vaultKeyB64 } = request.payload;
					const keys = await importVaultKeys(vaultKeyB64);
					vaultKey = keys.vaultKey;
					postSuccess(id, { ok: true });
					break;
				}
				default:
					throw new Error(`Unknown: ${(request as any).type}`);
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
