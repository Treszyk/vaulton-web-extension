import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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

	private normalizeEnc(val: any) {
		if (!val) return val;
		return {
			Nonce: val.Nonce ?? val.nonce,
			CipherText: val.CipherText ?? val.cipherText,
			Tag: val.Tag ?? val.tag,
		};
	}

	preLogin(accountId: string): Observable<PreLoginResponse> {
		return this.http
			.post<any>(`${API_BASE_URL}/auth/pre-login`, {
				AccountId: accountId,
			})
			.pipe(
				map((res) => ({
					S_Pwd: res.S_Pwd ?? res.s_Pwd,
					KdfMode: res.KdfMode ?? res.kdfMode,
					CryptoSchemaVer: res.CryptoSchemaVer ?? res.cryptoSchemaVer,
				})),
			);
	}

	login(accountId: string, verifier: string): Observable<ExtLoginResponse> {
		return this.http
			.post<any>(`${API_BASE_URL}/auth/ext/login`, {
				AccountId: accountId,
				Verifier: verifier,
			})
			.pipe(
				map((res) => ({
					AccessToken: res.AccessToken ?? res.accessToken,
					RefreshToken: res.RefreshToken ?? res.refreshToken,
					RefreshExpiresAt: res.RefreshExpiresAt ?? res.refreshExpiresAt,
					MkWrapPwd: this.normalizeEnc(res.MkWrapPwd ?? res.mkWrapPwd),
					MkWrapRk: this.normalizeEnc(res.MkWrapRk ?? res.mkWrapRk),
				})),
			);
	}

	refresh(refreshToken: string): Observable<ExtRefreshResponse> {
		return this.http
			.post<any>(`${API_BASE_URL}/auth/ext/refresh`, {
				RefreshToken: refreshToken,
			})
			.pipe(
				map((res) => ({
					AccessToken: res.AccessToken ?? res.accessToken,
					RefreshToken: res.RefreshToken ?? res.refreshToken,
					RefreshExpiresAt: res.RefreshExpiresAt ?? res.refreshExpiresAt,
				})),
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

	me(): Observable<any> {
		return this.http.get<any>(`${API_BASE_URL}/auth/me`);
	}
}
