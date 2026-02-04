import { Injectable, inject } from '@angular/core';
import { AuthCryptoService } from '../auth/auth-crypto.service';
import {
	EncryptedValueDto,
	EncryptedEntryResult,
} from '../crypto/worker/crypto.worker.types';
import { bytesToB64 } from '../crypto/b64';
import { VaultRecordInput } from './vault-record.model';

export type PlainEntry = VaultRecordInput;

@Injectable({ providedIn: 'root' })
export class VaultCryptoService {
	private readonly authCrypto = inject(AuthCryptoService);

	async encryptEntry(
		entry: PlainEntry,
		aadStr: string,
	): Promise<EncryptedEntryResult> {
		const json = JSON.stringify(entry);
		const aadB64 = bytesToB64(new TextEncoder().encode(aadStr));

		const ptBytes = new TextEncoder().encode(json);
		try {
			return await this.authCrypto.encryptEntry(ptBytes.buffer, aadB64);
		} finally {
			try {
				ptBytes.fill(0);
			} catch {}
		}
	}

	async decryptEntry(
		dto: EncryptedValueDto,
		aadStr: string,
	): Promise<PlainEntry> {
		const aadB64 = bytesToB64(new TextEncoder().encode(aadStr));
		const json = await this.authCrypto.decryptEntry(dto, aadB64);
		return JSON.parse(json) as PlainEntry;
	}
}
