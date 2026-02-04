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
	token: string,
	input: VaultRecordInput,
): Promise<string> {
	const { EntryId } = await apiPreCreateEntry(token);

	const encrypted = await crypto.encryptEntry(input, EntryId);

	await apiCreateEntry(token, {
		EntryId,
		Payload: encrypted.Payload,
	});

	return EntryId;
}

export async function performUpdateRecord(
	crypto: VaultOperationCrypto,
	token: string,
	id: string,
	input: VaultRecordInput,
): Promise<void> {
	const encrypted = await crypto.encryptEntry(input, id);

	await apiUpdateEntry(token, id, {
		Payload: encrypted.Payload,
	});
}
