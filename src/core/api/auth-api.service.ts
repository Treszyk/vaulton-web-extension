import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../config';

export interface PreLoginResponse {
	S_Pwd: string;
	KdfMode: number;
	CryptoSchemaVer: number;
}

export interface ExtLoginResponse {
	AccessToken: string;
	RefreshToken: string;
	RefreshExpiresAt: string;
	MkWrapPwd: any;
	MkWrapRk: any;
}

export interface ExtRefreshResponse {
	AccessToken: string;
	RefreshToken: string;
	RefreshExpiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
	private http = inject(HttpClient);

	preLogin(accountId: string): Observable<PreLoginResponse> {
		return this.http.post<PreLoginResponse>(`${API_BASE_URL}/auth/pre-login`, {
			AccountId: accountId,
		});
	}

	login(accountId: string, verifier: string): Observable<ExtLoginResponse> {
		return this.http.post<ExtLoginResponse>(`${API_BASE_URL}/auth/ext/login`, {
			AccountId: accountId,
			Verifier: verifier,
		});
	}

	refresh(refreshToken: string): Observable<ExtRefreshResponse> {
		return this.http.post<ExtRefreshResponse>(
			`${API_BASE_URL}/auth/ext/refresh`,
			{
				RefreshToken: refreshToken,
			},
		);
	}

	logout(refreshToken: string): Observable<void> {
		return this.http.post<void>(`${API_BASE_URL}/auth/ext/logout`, {
			RefreshToken: refreshToken,
		});
	}

	logoutAll(): Observable<void> {
		return this.http.post<void>(`${API_BASE_URL}/auth/ext/logout-all`, {});
	}
}
