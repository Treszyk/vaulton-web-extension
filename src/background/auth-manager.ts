import { API_BASE_URL } from '../config';

const browserApi: any =
	(globalThis as any).browser || (globalThis as any).chrome;

export class BackgroundAuthManager {
	async refreshTokens(): Promise<boolean> {
		const tokens = await this.getTokens();
		if (!tokens.refreshToken) {
			return false;
		}

		if (this.isTokenExpired(tokens.refreshExpiresAt)) {
			await this.clearSession();
			return false;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/auth/ext/refresh`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ RefreshToken: tokens.refreshToken }),
			});

			if (!response.ok) {
				if (response.status === 401) {
					await this.clearSession();
				}
				return false;
			}

			const data = await response.json();
			await this.saveSession(
				data.AccessToken,
				data.RefreshToken,
				data.RefreshExpiresAt,
			);
			return true;
		} catch (error) {
			return false;
		}
	}

	private isTokenExpired(expiresAt: string | null): boolean {
		if (!expiresAt) return true;
		const expiry = new Date(expiresAt).getTime();
		return Date.now() >= expiry - 30000;
	}

	private async getTokens(): Promise<{
		accessToken: string | null;
		refreshToken: string | null;
		refreshExpiresAt: string | null;
	}> {
		const local = await this.executeStorage('get', 'local', [
			'NeverLockout',
			'AccessToken',
			'RefreshToken',
			'RefreshExpiresAt',
		]);

		if (local?.NeverLockout === true) {
			return {
				accessToken: local.AccessToken || null,
				refreshToken: local.RefreshToken || null,
				refreshExpiresAt: local.RefreshExpiresAt || null,
			};
		}

		const session = await this.executeStorage('get', 'session', [
			'AccessToken',
			'RefreshToken',
			'RefreshExpiresAt',
		]);

		return {
			accessToken: session?.AccessToken || null,
			refreshToken: session?.RefreshToken || null,
			refreshExpiresAt: session?.RefreshExpiresAt || null,
		};
	}

	private async saveSession(
		accessToken: string,
		refreshToken: string,
		refreshExpiresAt: string,
	): Promise<void> {
		const local = await this.executeStorage('get', 'local', ['NeverLockout']);
		const data = {
			AccessToken: accessToken,
			RefreshToken: refreshToken,
			RefreshExpiresAt: refreshExpiresAt,
		};

		if (local?.NeverLockout === true) {
			await this.executeStorage('set', 'local', data);
		} else {
			await this.executeStorage('set', 'session', data);
		}
	}

	private async clearSession(): Promise<void> {
		const keys = ['AccessToken', 'RefreshToken', 'RefreshExpiresAt'];
		await this.executeStorage('remove', 'session', keys);
		await this.executeStorage('remove', 'local', keys);
	}

	private async executeStorage(
		method: string,
		area: 'local' | 'session',
		...args: any[]
	): Promise<any> {
		if (!browserApi || !browserApi.storage) return;
		const handle =
			area === 'session'
				? browserApi.storage.session || browserApi.storage.local
				: browserApi.storage.local;

		const isSession = handle === browserApi.storage.session;
		console.log(
			`[Background Vaulton] Storage API: ${isSession ? 'session' : 'local'} (Namespace: ${!!(globalThis as any).browser ? 'browser' : 'chrome'})`,
		);

		return new Promise((resolve, reject) => {
			try {
				let resolved = false;
				const callback = (data: any) => {
					if (resolved) return;
					resolved = true;
					if (browserApi.runtime?.lastError)
						reject(browserApi.runtime.lastError);
					else resolve(data);
				};

				const res = handle[method](...args, callback);
				if (res && typeof res.then === 'function') {
					res
						.then((val: any) => {
							if (!resolved) {
								resolved = true;
								resolve(val);
							}
						})
						.catch((err: any) => {
							if (!resolved) {
								resolved = true;
								reject(err);
							}
						});
				}
			} catch (e) {
				reject(e);
			}
		});
	}
}
