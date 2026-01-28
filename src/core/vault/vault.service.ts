import { Injectable, inject, signal } from '@angular/core';
import { BrowserStorageService } from '../storage/browser-storage.service';
import { VaultRecord, VaultRecordInput } from './vault-record.model';
import { VaultApiService } from '../api/vault-api.service';
import { VaultCryptoService } from './vault-crypto.service';
import { BackgroundAction, BackgroundResponse } from '../messaging';
import { firstValueFrom } from 'rxjs';
import {
	importSessionKey,
	decryptVaultCache,
	encryptVaultCache,
} from '../crypto/crypto-core';
import { bytesToB64 } from '../crypto/b64';

@Injectable({ providedIn: 'root' })
export class VaultService {
	private readonly storage = inject(BrowserStorageService);
	private readonly api = inject(VaultApiService);
	private readonly crypto = inject(VaultCryptoService);

	private readonly _records = signal<VaultRecord[]>([]);
	readonly records = this._records.asReadonly();
	readonly isLoading = signal(false);
	readonly isReady = signal(false);

	private readonly LOCAL_VAULT_NAME = 'EncryptedVault';
	private readonly SESSION_KEY_NAME = 'VaultSessionKey';

	constructor() {
		this.initStorageListener();
		this.syncStateFromStorage();
	}

	private initStorageListener(): void {
		if (typeof chrome !== 'undefined' && chrome.storage) {
			chrome.storage.onChanged.addListener((changes, area) => {
				if (changes['EncryptedVault'] || changes['VaultSessionKey']) {
					this.syncStateFromStorage();
				}
			});
		}
	}

	private async syncStateFromStorage(): Promise<void> {
		try {
			const vaultEncrypted = await this.storage.get(
				this.LOCAL_VAULT_NAME,
				'local',
			);
			const sessionKeyB64 = await this.storage.get(
				'VaultSessionKey',
				'session',
			);

			if (vaultEncrypted && sessionKeyB64) {
				try {
					const sessionKey = await importSessionKey(sessionKeyB64);
					const json = await decryptVaultCache(sessionKey, vaultEncrypted);
					const records = JSON.parse(json);
					this._records.set(records);
				} catch (e) {
					console.error('Failed to decrypt stored vault', e);
					this._records.set([]);
				}
			} else {
				this._records.set([]);
			}
		} finally {
			this.isReady.set(true);
		}
	}

	async ensureReady() {
		if (this.isReady()) return;
		return new Promise<void>((resolve) => {
			const sub = setInterval(() => {
				if (this.isReady()) {
					clearInterval(sub);
					resolve();
				}
			}, 50);
		});
	}

	async syncVault(force = false) {
		this.isLoading.set(true);
		try {
			const res = await this.sendCommand({
				type: 'SYNC_VAULT',
				payload: { force },
			});
			if (res.success) {
				await this.syncStateFromStorage();
			}
		} finally {
			this.isLoading.set(false);
		}
	}

	async addRecord(input: VaultRecordInput) {
		this.isLoading.set(true);
		try {
			const { EntryId } = await firstValueFrom(this.api.preCreate());

			const encrypted = await this.crypto.encryptEntry(
				input,
				input.website || '',
				EntryId,
			);

			await firstValueFrom(
				this.api.create({
					EntryId,
					DomainTag: encrypted.DomainTag,
					Payload: encrypted.Payload,
				}),
			);

			const newRecord: VaultRecord = { ...input, id: EntryId };
			const current = this._records();
			const updated = [newRecord, ...current];
			this._records.set(updated);
			await this.persistToLocal(updated);

			return true;
		} catch (e) {
			console.error('Add record failed', e);
			throw e;
		} finally {
			this.isLoading.set(false);
		}
	}

	async updateRecord(id: string, input: VaultRecordInput) {
		this.isLoading.set(true);
		try {
			const encrypted = await this.crypto.encryptEntry(
				input,
				input.website || '',
				id,
			);

			await firstValueFrom(
				this.api.update(id, {
					DomainTag: encrypted.DomainTag,
					Payload: encrypted.Payload,
				}),
			);

			const currentList = this._records();
			const updated = currentList.map((r) =>
				r.id === id ? { ...r, ...input } : r,
			);
			this._records.set(updated);
			await this.persistToLocal(updated);

			return true;
		} catch (e) {
			console.error('Update record failed', e);
			throw e;
		} finally {
			this.isLoading.set(false);
		}
	}

	async deleteRecord(id: string) {
		this.isLoading.set(true);
		try {
			await firstValueFrom(this.api.delete(id));

			const current = this._records();
			const updated = current.filter((r) => r.id !== id);
			this._records.set(updated);
			await this.persistToLocal(updated);

			return true;
		} catch (e) {
			console.error('Delete record failed', e);
			throw e;
		} finally {
			this.isLoading.set(false);
		}
	}

	private async persistToLocal(records: VaultRecord[]) {
		let sessionKeyB64 = await this.storage.get(
			this.SESSION_KEY_NAME,
			'session',
		);
		let sessionKey: CryptoKey;

		if (!sessionKeyB64) {
			sessionKey = await crypto.subtle.generateKey(
				{ name: 'AES-GCM', length: 256 },
				true,
				['encrypt', 'decrypt'],
			);
			const raw = await crypto.subtle.exportKey('raw', sessionKey);
			const b64 = bytesToB64(new Uint8Array(raw));
			await this.storage.set(this.SESSION_KEY_NAME, b64, 'session');
		} else {
			sessionKey = await importSessionKey(sessionKeyB64);
		}

		const json = JSON.stringify(records);
		const encryptedCache = await encryptVaultCache(sessionKey, json);

		await this.storage.set(this.LOCAL_VAULT_NAME, encryptedCache, 'local');
	}

	private sendCommand(action: BackgroundAction): Promise<BackgroundResponse> {
		return new Promise((resolve) => {
			chrome.runtime.sendMessage(action, (res) => resolve(res));
		});
	}

	clearData() {
		this._records.set([]);
	}
}
