import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../../config';

export interface EncryptedValue {
	Nonce: string;
	CipherText: string;
	Tag: string;
}

export interface EntryDto {
	Id: string;
	DomainTag: string;
	Payload: EncryptedValue;
}

export interface PreCreateEntryResponse {
	EntryId: string;
}

export interface CreateVaultEntryRequest {
	EntryId: string;
	DomainTag: string;
	Payload: EncryptedValue;
}

export interface UpdateVaultEntryRequest {
	DomainTag: string;
	Payload: EncryptedValue;
}

@Injectable({ providedIn: 'root' })
export class VaultApiService {
	private http = inject(HttpClient);
	private readonly baseUrl = `${API_BASE_URL}/vault/entries`;

	private normalizeEnc(val: any): EncryptedValue {
		return {
			Nonce: val.Nonce ?? val.nonce,
			CipherText: val.CipherText ?? val.cipherText,
			Tag: val.Tag ?? val.tag,
		};
	}

	list(skip = 0, take = 200): Observable<EntryDto[]> {
		return this.http
			.get<any[]>(this.baseUrl, {
				params: { skip, take },
				headers: {
					'Cache-Control': 'no-cache',
					Pragma: 'no-cache',
				},
			})
			.pipe(
				map((entries) =>
					entries.map((e) => ({
						Id: e.Id ?? e.id,
						DomainTag: e.DomainTag ?? e.domainTag,
						Payload: this.normalizeEnc(e.Payload ?? e.payload),
					})),
				),
			);
	}

	preCreate(): Observable<PreCreateEntryResponse> {
		return this.http
			.post<PreCreateEntryResponse>(`${this.baseUrl}/pre-create`, {})
			.pipe(
				map((res) => ({
					EntryId: (res as any).EntryId ?? (res as any).entryId,
				})),
			);
	}

	create(req: CreateVaultEntryRequest): Observable<{ EntryId: string }> {
		return this.http.post<{ EntryId: string }>(this.baseUrl, req);
	}

	update(id: string, req: UpdateVaultEntryRequest): Observable<void> {
		return this.http.put<void>(`${this.baseUrl}/${id}`, req);
	}

	delete(id: string): Observable<void> {
		return this.http.delete<void>(`${this.baseUrl}/${id}`);
	}
}
