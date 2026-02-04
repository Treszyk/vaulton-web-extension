import {
	apiCreateEntry,
	apiPreCreateEntry,
	apiUpdateEntry,
} from '../api/vault-api.client';
import type { VaultRecordInput } from './vault-record.model';

export interface VaultOperationCrypto {
	encryptEntry(
		payload: any,
		aad: string,
	): Promise<{
		Payload: {
			Nonce: string;
			CipherText: string;
			Tag: string;
		};
	}>;
}

export async function performAddRecord(
	crypto: VaultOperationCrypto,
	input: VaultRecordInput,
): Promise<string> {
	const { EntryId } = await apiPreCreateEntry();

	const encrypted = await crypto.encryptEntry(input, EntryId);

	await apiCreateEntry({
		EntryId,
		Payload: encrypted.Payload,
	});

	return EntryId;
}

export async function performUpdateRecord(
	crypto: VaultOperationCrypto,
	id: string,
	input: VaultRecordInput,
): Promise<void> {
	const encrypted = await crypto.encryptEntry(input, id);

	await apiUpdateEntry(id, {
		Payload: encrypted.Payload,
	});
}
