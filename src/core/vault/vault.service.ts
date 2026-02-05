import { Injectable, signal } from '@angular/core';
import { VaultRecord, VaultRecordInput } from './vault-record.model';
import { StorageCore } from '../storage/storage-core';
import { importVaultKeys, encryptVaultRecord } from '../crypto/crypto-core';
import { EncryptedValueDto } from '../crypto/worker/crypto.worker.types';
import {
	apiCreateEntry,
	apiDeleteEntry,
	apiPreCreateEntry,
	apiUpdateEntry,
} from '../api/vault-api.client';
import { loadVault, saveVault } from './vault-storage';
import { sendCommand } from '../messaging';

@Injectable({ providedIn: 'root' })
export class VaultService {
	private readonly _records = signal<VaultRecord[]>([]);
	readonly records = this._records.asReadonly();
	readonly isLoading = signal(false);
	readonly isReady = signal(false);

	constructor() {
		this.initStorageListener();
		this.checkVaultStatus();
	}

	private async checkVaultStatus(): Promise<void> {
		await this.syncStateFromStorage();
	}

	private initStorageListener(): void {
		if (typeof chrome !== 'undefined' && chrome.storage) {
			const LOCAL_VAULT_NAME = StorageCore.KEYS.ENCRYPTED_VAULT;
			const SESSION_KEY_NAME = StorageCore.KEYS.VAULT_SESSION_KEY;
			chrome.storage.onChanged.addListener((changes) => {
				if (changes[LOCAL_VAULT_NAME] || changes[SESSION_KEY_NAME]) {
					this.syncStateFromStorage();
				}
			});
		}
	}

	private async syncStateFromStorage(): Promise<void> {
		try {
			const records = await loadVault();
			this._records.set(records);
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
			await sendCommand({ type: 'SYNC_VAULT', payload: { force } });
			await this.syncStateFromStorage();
		} finally {
			this.isLoading.set(false);
		}
	}

	private async encryptEntry(
		entry: VaultRecordInput,
		aad: string,
	): Promise<{ Payload: EncryptedValueDto }> {
		const keyB64 = await StorageCore.get(StorageCore.KEYS.VAULT_KEY, 'session');
		if (!keyB64) throw new Error('Vault locked');
		const { vaultKey } = await importVaultKeys(keyB64);
		return encryptVaultRecord(vaultKey, entry, aad);
	}

	async addRecord(input: VaultRecordInput) {
		this.isLoading.set(true);
		try {
			const { EntryId } = await apiPreCreateEntry();
			const encrypted = await this.encryptEntry(input, EntryId);

			await apiCreateEntry({ EntryId, Payload: encrypted.Payload });

			const updated = [{ ...input, id: EntryId }, ...this._records()];
			this._records.set(updated);
			await saveVault(updated);
			return true;
		} catch (e) {
			throw e;
		} finally {
			this.isLoading.set(false);
		}
	}

	async updateRecord(id: string, input: VaultRecordInput) {
		this.isLoading.set(true);
		try {
			const encrypted = await this.encryptEntry(input, id);
			await apiUpdateEntry(id, { Payload: encrypted.Payload });

			const updated = this._records().map((r) =>
				r.id === id ? { ...r, ...input } : r,
			);
			this._records.set(updated);
			await saveVault(updated);
			return true;
		} catch (e) {
			throw e;
		} finally {
			this.isLoading.set(false);
		}
	}

	async deleteRecord(id: string) {
		this.isLoading.set(true);
		try {
			await apiDeleteEntry(id);
			const updated = this._records().filter((r) => r.id !== id);
			this._records.set(updated);
			await saveVault(updated);
			return true;
		} catch (e) {
			throw e;
		} finally {
			this.isLoading.set(false);
		}
	}

	clearData() {
		this._records.set([]);
	}
}
