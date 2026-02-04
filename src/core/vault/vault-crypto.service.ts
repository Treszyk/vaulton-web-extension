import { Injectable } from '@angular/core';
import { StorageCore } from '../storage/storage-core';
import {
	importVaultKeys,
	encryptVaultEntry,
	decryptVaultEntry,
} from '../crypto/crypto-core';
import { EncryptedValueDto } from '../crypto/worker/crypto.worker.types';
import { bytesToB64 } from '../crypto/b64';
import { VaultRecordInput } from './vault-record.model';

export type PlainEntry = VaultRecordInput;

@Injectable({ providedIn: 'root' })
export class VaultCryptoService {
	async encryptEntry(
		entry: PlainEntry,
		aadStr: string,
	): Promise<{ Payload: EncryptedValueDto }> {
		const vaultKeyB64 = await StorageCore.get('VaultKeyB64', 'session');
		if (!vaultKeyB64) throw new Error('Vault locked');

		const { vaultKey } = await importVaultKeys(vaultKeyB64);
		const aadB64 = bytesToB64(new TextEncoder().encode(aadStr));
		const json = JSON.stringify(entry);
		const ptBytes = new TextEncoder().encode(json);

		try {
			const dto = await encryptVaultEntry(vaultKey, ptBytes.buffer, aadB64);
			return dto;
		} finally {
			try {
				if (ptBytes) ptBytes.fill(0);
			} catch {}
		}
	}

	async decryptEntry(
		dto: EncryptedValueDto,
		aadStr: string,
	): Promise<PlainEntry> {
		const vaultKeyB64 = await StorageCore.get('VaultKeyB64', 'session');
		if (!vaultKeyB64) throw new Error('Vault locked');

		const { vaultKey } = await importVaultKeys(vaultKeyB64);
		const aadB64 = bytesToB64(new TextEncoder().encode(aadStr));

		const ptBuf = await decryptVaultEntry(vaultKey, dto, aadB64);
		const json = new TextDecoder().decode(ptBuf);
		return JSON.parse(json) as PlainEntry;
	}
}
