import { fetchClient } from './fetch-client';
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
	CryptoSchemaVer: number;
}

export interface ExtRefreshResponse {
	AccessToken: string;
	RefreshToken: string;
	RefreshExpiresAt: string;
}

function normalizeEnc(val: any) {
	if (!val) return val;
	return {
		Nonce: val.Nonce ?? val.nonce,
		CipherText: val.CipherText ?? val.cipherText,
		Tag: val.Tag ?? val.tag,
	};
}

async function handleResponse<T>(res: Response): Promise<T> {
	if (!res.ok) {
		const text = (await res.text()).trim();
		let errorMsg = text || `API Error: ${res.status}`;

		try {
			const json = JSON.parse(text);
			errorMsg =
				json.MESSAGE || json.message || json.Error || json.error || errorMsg;
			if (typeof errorMsg !== 'string' && errorMsg) {
				errorMsg = JSON.stringify(errorMsg);
			}
		} catch {
			// Not JSON
		}

		throw new Error(errorMsg);
	}
	const json = await res.json();
	return json as T;
}

export async function apiPreLogin(
	accountId: string,
): Promise<PreLoginResponse> {
	const res = await fetch(`${API_BASE_URL}/auth/pre-login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ AccountId: accountId }),
	});
	const data = await handleResponse<any>(res);
	return {
		S_Pwd: data.S_Pwd ?? data.s_Pwd,
		KdfMode: data.KdfMode ?? data.kdfMode,
		CryptoSchemaVer: data.CryptoSchemaVer ?? data.cryptoSchemaVer,
	};
}

export async function apiLogin(
	accountId: string,
	verifier: string,
): Promise<ExtLoginResponse> {
	const res = await fetch(`${API_BASE_URL}/auth/ext/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ AccountId: accountId, Verifier: verifier }),
	});
	const data = await handleResponse<any>(res);
	return {
		AccessToken: data.AccessToken ?? data.accessToken,
		RefreshToken: data.RefreshToken ?? data.refreshToken,
		RefreshExpiresAt: data.RefreshExpiresAt ?? data.refreshExpiresAt,
		MkWrapPwd: normalizeEnc(data.MkWrapPwd ?? data.mkWrapPwd),
		MkWrapRk: normalizeEnc(data.MkWrapRk ?? data.mkWrapRk),
		CryptoSchemaVer: data.CryptoSchemaVer ?? data.cryptoSchemaVer ?? 1,
	};
}

export async function apiRefresh(
	refreshToken: string,
): Promise<ExtRefreshResponse> {
	const res = await fetch(`${API_BASE_URL}/auth/ext/refresh`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ RefreshToken: refreshToken }),
	});

	const data = await handleResponse<any>(res);
	return {
		AccessToken: data.AccessToken ?? data.accessToken,
		RefreshToken: data.RefreshToken ?? data.refreshToken,
		RefreshExpiresAt: data.RefreshExpiresAt ?? data.refreshExpiresAt,
	};
}

export async function apiLogout(refreshToken: string): Promise<void> {
	const res = await fetch(`${API_BASE_URL}/auth/ext/logout`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ RefreshToken: refreshToken }),
	});
	await handleResponse<void>(res);
}

export async function apiLogoutAll(): Promise<void> {
	await fetchClient(`${API_BASE_URL}/auth/ext/logout-all`, {
		method: 'POST',
	});
}

export async function apiAuthMe(): Promise<any> {
	return fetchClient<any>(`${API_BASE_URL}/auth/me`);
}
