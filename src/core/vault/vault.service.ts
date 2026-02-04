import { Injectable, inject, signal } from '@angular/core';
import { BrowserStorageService } from '../storage/browser-storage.service';
import { VaultRecord, VaultRecordInput } from './vault-record.model';
import { VaultCryptoService } from './vault-crypto.service';
import { BackgroundAction, BackgroundResponse } from '../messaging';

import { apiDeleteEntry } from '../api/vault-api.client';
import { performAddRecord, performUpdateRecord } from './vault-operations';
import { loadVault, saveVault } from './vault-storage';

@Injectable({ providedIn: 'root' })
export class VaultService {
	private readonly storage = inject(BrowserStorageService);
	private readonly crypto = inject(VaultCryptoService);

	private readonly _records = signal<VaultRecord[]>([]);
	readonly records = this._records.asReadonly();
	readonly isLoading = signal(false);
	readonly isReady = signal(false);

	constructor() {
		this.initStorageListener();
		this.syncStateFromStorage();
	}

	private initStorageListener(): void {
		if (typeof chrome !== 'undefined' && chrome.storage) {
			chrome.storage.onChanged.addListener((changes, _area) => {
				if (changes['EncryptedVault'] || changes['VaultSessionKey']) {
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
			const { AccessToken } = await this.storage.getSmartMultiple([
				'AccessToken',
			]);
			if (!AccessToken) throw new Error('Not authenticated');

			const EntryId = await performAddRecord(this.crypto, AccessToken, input);

			const newRecord: VaultRecord = { ...input, id: EntryId };
			const current = this._records();
			const updated = [newRecord, ...current];
			this._records.set(updated);
			await saveVault(updated);

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
			const { AccessToken } = await this.storage.getSmartMultiple([
				'AccessToken',
			]);
			if (!AccessToken) throw new Error('Not authenticated');

			await performUpdateRecord(this.crypto, AccessToken, id, input);

			const currentList = this._records();
			const updated = currentList.map((r) =>
				r.id === id ? { ...r, ...input } : r,
			);
			this._records.set(updated);
			await saveVault(updated);

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
			const { AccessToken } = await this.storage.getSmartMultiple([
				'AccessToken',
			]);
			if (!AccessToken) throw new Error('Not authenticated');

			await apiDeleteEntry(AccessToken, id);

			const current = this._records();
			const updated = current.filter((r) => r.id !== id);
			this._records.set(updated);
			await saveVault(updated);

			return true;
		} catch (e) {
			console.error('Delete record failed', e);
			throw e;
		} finally {
			this.isLoading.set(false);
		}
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
