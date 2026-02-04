import { API_BASE_URL } from '../../config';
export interface EncryptedValue {
	Nonce: string;
	CipherText: string;
	Tag: string;
}

export interface EntryDto {
	Id: string;
	Payload: EncryptedValue;
}

export interface PreCreateEntryResponse {
	EntryId: string;
}

export interface CreateVaultEntryRequest {
	EntryId: string;
	Payload: EncryptedValue;
}

export interface UpdateVaultEntryRequest {
	Payload: EncryptedValue;
}

const BASE_URL = `${API_BASE_URL}/vault/entries`;

async function handleResponse<T>(res: Response): Promise<T> {
	if (!res.ok) {
		throw new Error(`API Error: ${res.status} ${res.statusText}`);
	}
	const text = await res.text();
	return text ? JSON.parse(text) : ({} as T);
}

export async function apiListEntries(
	token: string,
	skip = 0,
	take = 200,
): Promise<EntryDto[]> {
	const url = new URL(BASE_URL);
	url.searchParams.set('skip', skip.toString());
	url.searchParams.set('take', take.toString());

	const res = await fetch(url.toString(), {
		headers: {
			Authorization: `Bearer ${token}`,
			'Cache-Control': 'no-cache',
			Pragma: 'no-cache',
		},
	});

	return handleResponse<EntryDto[]>(res);
}

export async function apiPreCreateEntry(
	token: string,
): Promise<PreCreateEntryResponse> {
	const res = await fetch(`${BASE_URL}/pre-create`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});
	return handleResponse<PreCreateEntryResponse>(res);
}

export async function apiCreateEntry(
	token: string,
	req: CreateVaultEntryRequest,
): Promise<{ EntryId: string }> {
	const res = await fetch(BASE_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(req),
	});
	return handleResponse<{ EntryId: string }>(res);
}

export async function apiUpdateEntry(
	token: string,
	id: string,
	req: UpdateVaultEntryRequest,
): Promise<void> {
	const res = await fetch(`${BASE_URL}/${id}`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(req),
	});
	return handleResponse<void>(res);
}

export async function apiDeleteEntry(token: string, id: string): Promise<void> {
	const res = await fetch(`${BASE_URL}/${id}`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
	return handleResponse<void>(res);
}
