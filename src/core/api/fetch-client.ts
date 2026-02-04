import { StorageCore } from '../storage/storage-core';
import { apiRefresh } from './auth-api.client';

let refreshPromise: Promise<string> | null = null;

async function getTokens() {
	const area = await StorageCore.detectArea();
	return StorageCore.getMultiple(['AccessToken', 'RefreshToken'], area);
}

export async function fetchClient<T>(
	url: string,
	options: RequestInit = {},
): Promise<T> {
	const sentTokens = await getTokens();
	let token = sentTokens['AccessToken'];

	const headers = new Headers(options.headers || {});
	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}
	if (
		!headers.has('Content-Type') &&
		options.method &&
		options.method !== 'GET'
	) {
		headers.set('Content-Type', 'application/json');
	}

	const config = { ...options, headers };
	let response = await fetch(url, config);

	if (response.status === 401) {
		const currentTokens = await getTokens();
		if (!currentTokens['RefreshToken']) {
			throw new Error('Unauthorized');
		}

		function isTokenExpired(expiresAt: string | null): boolean {
			if (!expiresAt) return true;
			const expiry = new Date(expiresAt).getTime();
			return Date.now() >= expiry - 30000;
		}

		if (!refreshPromise) {
			refreshPromise = (async () => {
				try {
					const { RefreshToken, RefreshExpiresAt } = currentTokens;

					if (isTokenExpired(RefreshExpiresAt)) {
						console.warn(
							'Local Refresh check: Token expired. Skipping API call.',
						);
						throw new Error('Session expired locally');
					}

					const res = await apiRefresh(RefreshToken);
					const area = await StorageCore.detectArea();
					await StorageCore.setMultiple(
						{
							AccessToken: res.AccessToken,
							RefreshToken: res.RefreshToken,
							RefreshExpiresAt: res.RefreshExpiresAt,
						},
						area,
					);
					return res.AccessToken;
				} catch (e) {
					console.error('Refresh failed', e);
					const area = await StorageCore.detectArea();
					await StorageCore.removeMultiple(
						['AccessToken', 'RefreshToken', 'VaultKeyB64'],
						area,
					);
					throw e;
				} finally {
					refreshPromise = null;
				}
			})();
		}

		try {
			const newToken = await refreshPromise;
			headers.set('Authorization', `Bearer ${newToken}`);
			response = await fetch(url, { ...options, headers });
		} catch {
			throw new Error('Session expired');
		}
	}

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || `API Error: ${response.status}`);
	}

	if (response.status === 204) {
		return {} as T;
	}

	const text = await response.text();
	return text ? JSON.parse(text) : ({} as T);
}
