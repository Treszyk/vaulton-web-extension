import { Injectable, inject } from '@angular/core';
import { CryptoWorkerFactory } from '../crypto/worker/crypto-worker.factory';
import { StorageCore } from '../storage/storage-core';
import { PreLoginResponse } from '../api/auth-api.client';
import type {
	EncryptedValueDto,
	CheckStatusResponse,
} from '../crypto/worker/crypto.worker.types';

@Injectable({ providedIn: 'root' })
export class AuthCryptoService {
	private workerFactory = inject(CryptoWorkerFactory);
	private worker: Worker | null = null;
	private pendingRequests = new Map<
		string,
		{ resolve: (val: any) => void; reject: (err: any) => void; timeoutId: any }
	>();
	private isWorking = false;
	private initPromise: Promise<void> | null = null;

	private async ensureWorker() {
		if (this.initPromise) return this.initPromise;

		this.initPromise = (async () => {
			this.worker = this.workerFactory.create();

			this.worker.onmessage = ({
				data,
			}: MessageEvent<{
				ok: boolean;
				result?: any;
				error?: string;
				id: string;
			}>) => {
				const { ok, result, error } = data;
				const pending = this.pendingRequests.get(data.id);
				if (pending) {
					clearTimeout(pending.timeoutId);
					if (!ok) {
						pending.reject(new Error(error));
					} else {
						pending.resolve(result);
					}
					this.pendingRequests.delete(data.id);
				}
			};

			this.worker.onerror = (err: ErrorEvent) => {
				this.rejectAllPending(
					new Error(`Crypto Worker crashed: ${err.message || 'Unknown error'}`),
				);
				this.terminate();
			};

			const area = await StorageCore.detectArea();
			const storedKeys = (await StorageCore.getMultiple(
				['VaultKeyB64'],
				area,
			)) as { VaultKeyB64?: string };

			if (storedKeys['VaultKeyB64']) {
				const id = 'HYDRATE_' + crypto.randomUUID();
				const hydrationPromise = new Promise<void>((resolve, reject) => {
					const tId = setTimeout(
						() => reject(new Error('Hydration timeout')),
						5000,
					);
					this.pendingRequests.set(id, {
						resolve: () => {
							clearTimeout(tId);
							resolve();
						},
						reject: (err) => {
							clearTimeout(tId);
							reject(err);
						},
						timeoutId: tId,
					});
				});

				this.worker.postMessage({
					id,
					payload: {
						type: 'IMPORT_KEYS',
						payload: {
							vaultKeyB64: storedKeys['VaultKeyB64'],
						},
					},
				});

				await hydrationPromise;
			}
		})();

		return this.initPromise;
	}

	private rejectAllPending(error: Error) {
		for (const req of this.pendingRequests.values()) {
			clearTimeout(req.timeoutId);
			req.reject(error);
		}
		this.pendingRequests.clear();
		this.isWorking = false;
		this.initPromise = null;
	}

	terminate() {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		this.initPromise = null;
		this.rejectAllPending(new Error('Worker terminated'));
	}

	async buildLogin(
		password: string,
		preLogin: PreLoginResponse,
	): Promise<{ verifier: string }> {
		if (this.isWorking) {
			throw new Error('Crypto worker is busy.');
		}
		this.isWorking = true;

		let pwdBytes: Uint8Array | null = new TextEncoder().encode(password);
		const passwordBuffer = pwdBytes.buffer;

		try {
			const res = await this.postToWorker<{ verifier: string }>(
				'LOGIN',
				{
					passwordBuffer,
					saltB64: preLogin.S_Pwd,
					kdfMode: preLogin.KdfMode,
				},
				[passwordBuffer],
			);
			return res;
		} finally {
			if (pwdBytes) {
				try {
					pwdBytes.fill(0);
				} catch {}
				pwdBytes = null;
			}
			this.isWorking = false;
		}
	}

	async finalizeLogin(
		mkWrapPwd: EncryptedValueDto,
		schemaVer: number,
		accountId: string,
	): Promise<{ vaultKeyB64: string }> {
		const res = await this.postToWorker<{
			vaultKeyB64: string;
		}>('FINALIZE_LOGIN', {
			MkWrapPwd: mkWrapPwd,
			CryptoSchemaVer: schemaVer,
			AccountId: accountId,
		});

		return res;
	}

	async unlock(
		password: string,
		bundle: {
			S_Pwd: string;
			KdfMode: number;
			MkWrapPwd: EncryptedValueDto;
			CryptoSchemaVer: number;
			AccountId: string;
		},
	): Promise<void> {
		if (this.isWorking) {
			throw new Error('Crypto worker is busy.');
		}
		this.isWorking = true;
		let pwdBytes: Uint8Array | null = new TextEncoder().encode(password);
		const passwordBuffer = pwdBytes.buffer;

		try {
			const res = await this.postToWorker<{ vaultKeyB64: string }>(
				'UNLOCK',
				{
					passwordBuffer,
					saltB64: bundle.S_Pwd,
					kdfMode: bundle.KdfMode,
					MkWrapPwd: bundle.MkWrapPwd,
					CryptoSchemaVer: bundle.CryptoSchemaVer,
					AccountId: bundle.AccountId,
				},
				[passwordBuffer],
			);

			if (res.vaultKeyB64) {
				await StorageCore.set('VaultKeyB64', res.vaultKeyB64, 'session');
			}
		} finally {
			if (pwdBytes) {
				try {
					pwdBytes.fill(0);
				} catch {}
				pwdBytes = null;
			}
			this.isWorking = false;
		}
	}

	async checkStatus(): Promise<boolean> {
		try {
			const res = await this.postToWorker<CheckStatusResponse>(
				'CHECK_STATUS',
				{},
			);
			return res.isUnlocked;
		} catch {
			return false;
		}
	}

	async clearKeys(): Promise<void> {
		try {
			await StorageCore.removeMultiple(
				['VaultKeyB64', 'VaultSessionKey'],
				'session',
			);
			await this.postToWorker('CLEAR_KEYS', {});
		} catch {}
	}

	private async postToWorker<T>(
		type: string,
		payload: any,
		transfer?: Transferable[],
	): Promise<T> {
		await this.ensureWorker();

		const id = crypto.randomUUID();
		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				if (this.pendingRequests.has(id)) {
					this.pendingRequests
						.get(id)
						?.reject(new Error(`Crypto operation timed out (${type})`));
					this.pendingRequests.delete(id);
				}
			}, 60000);

			this.pendingRequests.set(id, { resolve, reject, timeoutId });
			try {
				this.worker!.postMessage(
					{ id, payload: { type, payload } },
					transfer || [],
				);
			} catch (e) {
				reject(e);
			}
		});
	}
}
