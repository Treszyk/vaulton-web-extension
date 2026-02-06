import { StorageCore } from '../storage/storage-core';
import { apiRefresh } from './auth-api.client';
import { isTokenExpired } from '../auth/auth-utils';

let refreshPromise: Promise<string> | null = null;

export async function fetchClient<T>(
	url: string,
	options: RequestInit = {},
): Promise<T> {
	const accessToken = await StorageCore.get(StorageCore.KEYS.ACCESS_TOKEN);

	const headers = new Headers(options.headers || {});
	if (accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`);
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
		const refreshToken = await StorageCore.get(StorageCore.KEYS.REFRESH_TOKEN);
		if (!refreshToken) {
			throw new Error('Session expired');
		}

		if (!refreshPromise) {
			refreshPromise = (async () => {
				const keys = StorageCore.KEYS;
				try {
					const refreshExpiresAt = await StorageCore.get(
						keys.REFRESH_EXPIRES_AT,
					);

					if (isTokenExpired(refreshExpiresAt)) {
						console.warn(
							'Local Refresh check: Token expired. Skipping API call.',
						);
						throw new Error('Session expired locally');
					}

					const refreshRes = await apiRefresh(refreshToken);
					await StorageCore.setMultiple({
						[keys.ACCESS_TOKEN]: refreshRes.AccessToken,
						[keys.REFRESH_TOKEN]: refreshRes.RefreshToken,
						[keys.REFRESH_EXPIRES_AT]: refreshRes.RefreshExpiresAt,
					});
					return refreshRes.AccessToken;
				} catch (e) {
					console.error('Refresh failed', e);
					await StorageCore.removeMultiple([
						keys.ACCESS_TOKEN,
						keys.REFRESH_TOKEN,
						keys.VAULT_KEY,
					]);
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
