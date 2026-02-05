import { fetchClient } from './fetch-client';
import { API_BASE_URL } from '../../config';
import { EncryptedValueDto } from '../crypto/worker/crypto.worker.types';

export interface EntryDto {
	Id: string;
	Payload: EncryptedValueDto;
}

export interface PreCreateEntryResponse {
	EntryId: string;
}

export interface CreateVaultEntryRequest {
	EntryId: string;
	Payload: EncryptedValueDto;
}

export interface UpdateVaultEntryRequest {
	Payload: EncryptedValueDto;
}

const BASE_URL = `${API_BASE_URL}/vault/entries`;

export async function apiListEntries(
	skip = 0,
	take = 200,
): Promise<EntryDto[]> {
	const url = new URL(BASE_URL);
	url.searchParams.set('skip', skip.toString());
	url.searchParams.set('take', take.toString());

	return fetchClient<EntryDto[]>(url.toString());
}

export async function apiPreCreateEntry(): Promise<PreCreateEntryResponse> {
	return fetchClient<PreCreateEntryResponse>(`${BASE_URL}/pre-create`, {
		method: 'POST',
	});
}

export async function apiCreateEntry(
	req: CreateVaultEntryRequest,
): Promise<{ EntryId: string }> {
	return fetchClient<{ EntryId: string }>(BASE_URL, {
		method: 'POST',
		body: JSON.stringify(req),
	});
}

export async function apiUpdateEntry(
	id: string,
	req: UpdateVaultEntryRequest,
): Promise<void> {
	return fetchClient<void>(`${BASE_URL}/${id}`, {
		method: 'PUT',
		body: JSON.stringify(req),
	});
}

export async function apiDeleteEntry(id: string): Promise<void> {
	return fetchClient<void>(`${BASE_URL}/${id}`, {
		method: 'DELETE',
	});
}
