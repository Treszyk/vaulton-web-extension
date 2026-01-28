import { Injectable, inject, signal } from '@angular/core';
import { VaultApiService, EntryDto } from '../api/vault-api.service';
import { VaultCryptoService } from './vault-crypto.service';
import { BrowserStorageService } from '../storage/browser-storage.service';
import { VaultRecord, VaultRecordInput } from './vault-record.model';
import { firstValueFrom } from 'rxjs';
import { bytesToB64, b64ToBytes } from '../crypto/b64';

@Injectable({ providedIn: 'root' })
export class VaultService {
	private readonly api = inject(VaultApiService);
	private readonly crypto = inject(VaultCryptoService);
	private readonly storage = inject(BrowserStorageService);

	private readonly _records = signal<VaultRecord[]>([]);
	readonly records = this._records.asReadonly();
	readonly isLoading = signal(false);
	readonly isReady = signal(false);

	private sessionKey: CryptoKey | null = null;
	private readonly SESSION_KEY_NAME = 'VaultSessionKey';
	private readonly LOCAL_VAULT_NAME = 'EncryptedVault';

	constructor() {
		this.init();
	}

	private async init() {
		try {
			const sessionData = await this.storage.get(
				this.SESSION_KEY_NAME,
				'session',
			);
			if (sessionData) {
				this.sessionKey = await crypto.subtle.importKey(
					'raw',
					b64ToBytes(sessionData) as any,
					{ name: 'AES-GCM', length: 256 },
					false,
					['encrypt', 'decrypt'],
				);

				const localData = await this.storage.get(
					this.LOCAL_VAULT_NAME,
					'local',
				);
				if (localData) {
					const decrypted = await this.decryptLocal(localData);
					this._records.set(JSON.parse(decrypted));
				}
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
		await this.ensureReady();

		if (!force && this._records().length > 0) {
			return;
		}

		if (force) {
			this._records.set([]);
		}

		this.isLoading.set(true);
		try {
			const encryptedEntries = await firstValueFrom(this.api.list());
			const decryptedRecords: VaultRecord[] = [];

			for (const entry of encryptedEntries) {
				try {
					const data = await this.crypto.decryptEntry(entry.Payload, entry.Id);
					decryptedRecords.push({
						id: entry.Id,
						...data,
					});
				} catch (e) {
					console.warn(`Failed to decrypt entry ${entry.Id}`, e);
				}
			}

			this._records.set(decryptedRecords);
			await this.persistToLocal(decryptedRecords);
		} catch (e) {
			console.error('Sync failed', e);
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
		if (!this.sessionKey) {
			const key = await crypto.subtle.generateKey(
				{ name: 'AES-GCM', length: 256 },
				true,
				['encrypt', 'decrypt'],
			);
			this.sessionKey = key;
			const exported = await crypto.subtle.exportKey('raw', key);
			await this.storage.set(
				this.SESSION_KEY_NAME,
				bytesToB64(new Uint8Array(exported)),
				'session',
			);
		}

		const json = JSON.stringify(records);
		const encrypted = await this.encryptLocal(json);
		await this.storage.set(this.LOCAL_VAULT_NAME, encrypted, 'local');
	}

	private async encryptLocal(plaintext: string): Promise<string> {
		if (!this.sessionKey) throw new Error('No session key');
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const ptBytes = new TextEncoder().encode(plaintext);
		const ctBuf = await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv },
			this.sessionKey,
			ptBytes as any,
		);

		const combined = new Uint8Array(iv.length + ctBuf.byteLength);
		combined.set(iv, 0);
		combined.set(new Uint8Array(ctBuf), iv.length);

		return bytesToB64(combined);
	}

	private async decryptLocal(combinedB64: string): Promise<string> {
		if (!this.sessionKey) throw new Error('No session key');
		const combined = b64ToBytes(combinedB64);
		const iv = combined.slice(0, 12);
		const ct = combined.slice(12);

		const ptBuf = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv },
			this.sessionKey,
			ct as any,
		);

		return new TextDecoder().decode(ptBuf);
	}

	async clearData() {
		this._records.set([]);
		this.sessionKey = null;
		await this.storage.remove(this.SESSION_KEY_NAME, 'session');
		await this.storage.remove(this.LOCAL_VAULT_NAME, 'local');
	}
}
