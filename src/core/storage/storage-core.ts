export type StorageArea = 'local' | 'session';

export const browserApi: any =
	(globalThis as any).browser || (globalThis as any).chrome;

export class StorageCore {
	static readonly KEYS = {
		ACCESS_TOKEN: 'AccessToken',
		REFRESH_TOKEN: 'RefreshToken',
		REFRESH_EXPIRES_AT: 'RefreshExpiresAt',
		VAULT_KEY: 'VaultKeyB64',
		VAULT_SESSION_KEY: 'VaultSessionKey',
		ACCOUNT_ID: 'AccountId',
		LOCKOUT_STRATEGY: 'LockoutStrategy',
		ENCRYPTED_VAULT: 'EncryptedVault',
		PENDING_SAVE: 'PendingSavePrompts',
		EXCLUDED_SITES: 'ExcludedSites',
		LAST_SYNC_TIME: 'LastSyncTime',
		LAST_VERIFY_TIME: 'LastVerifyTime',
	};

	private static readonly KEY_CHART: {
		[key: string]: StorageArea | 'dynamic';
	} = {
		[StorageCore.KEYS.ACCESS_TOKEN]: 'dynamic',
		[StorageCore.KEYS.REFRESH_TOKEN]: 'dynamic',
		[StorageCore.KEYS.REFRESH_EXPIRES_AT]: 'dynamic',
		[StorageCore.KEYS.VAULT_KEY]: 'dynamic',
		[StorageCore.KEYS.VAULT_SESSION_KEY]: 'session',
		[StorageCore.KEYS.ACCOUNT_ID]: 'local',
		[StorageCore.KEYS.LOCKOUT_STRATEGY]: 'local',
		[StorageCore.KEYS.ENCRYPTED_VAULT]: 'local',
		[StorageCore.KEYS.EXCLUDED_SITES]: 'local',
		[StorageCore.KEYS.PENDING_SAVE]: 'session',
		[StorageCore.KEYS.LAST_SYNC_TIME]: 'session',
		[StorageCore.KEYS.LAST_VERIFY_TIME]: 'session',
	};

	private static strategyCache: {
		val: StorageArea | null;
		expiry: number;
	} = { val: null, expiry: 0 };

	static async get(key: string, area?: StorageArea): Promise<any> {
		const targetArea = area || (await this.resolveArea(key));
		const result = await this.execute('get', targetArea, [key]);
		return result ? result[key] : undefined;
	}

	static async set(key: string, value: any, area?: StorageArea): Promise<void> {
		if (key === this.KEYS.LOCKOUT_STRATEGY) {
			this.invalidateStrategyCache();
		}
		const targetArea = area || (await this.resolveArea(key));
		await this.execute('set', targetArea, { [key]: value });
	}

	static async setMultiple(
		items: { [key: string]: any },
		area?: StorageArea,
	): Promise<void> {
		if (Object.keys(items).includes(this.KEYS.LOCKOUT_STRATEGY)) {
			this.invalidateStrategyCache();
		}
		if (area) {
			await this.execute('set', area, items);
			return;
		}

		const buckets: { [key in StorageArea]: { [key: string]: any } } = {
			local: {},
			session: {},
		};

		for (const [key, val] of Object.entries(items)) {
			const target = await this.resolveArea(key);
			buckets[target][key] = val;
		}

		if (Object.keys(buckets.local).length > 0) {
			await this.execute('set', 'local', buckets.local);
		}
		if (Object.keys(buckets.session).length > 0) {
			await this.execute('set', 'session', buckets.session);
		}
	}

	static async getMultiple(
		keys: string[],
		area?: StorageArea,
	): Promise<{ [key: string]: any }> {
		if (area) {
			return (await this.execute('get', area, keys)) || {};
		}

		const buckets: { [key in StorageArea]: string[] } = {
			local: [],
			session: [],
		};

		for (const key of keys) {
			const target = await this.resolveArea(key);
			buckets[target].push(key);
		}

		const results: { [key: string]: any } = {};
		if (buckets.local.length > 0) {
			Object.assign(results, await this.execute('get', 'local', buckets.local));
		}
		if (buckets.session.length > 0) {
			Object.assign(
				results,
				await this.execute('get', 'session', buckets.session),
			);
		}
		return results;
	}

	static async remove(key: string, area?: StorageArea): Promise<void> {
		const targetArea = area || (await this.resolveArea(key));
		await this.execute('remove', targetArea, [key]);
	}

	static async removeMultiple(
		keys: string[],
		area?: StorageArea,
	): Promise<void> {
		if (area) {
			await this.execute('remove', area, keys);
			return;
		}

		const buckets: { [key in StorageArea]: string[] } = {
			local: [],
			session: [],
		};

		for (const key of keys) {
			const target = await this.resolveArea(key);
			buckets[target].push(key);
		}

		if (buckets.local.length > 0) {
			await this.execute('remove', 'local', buckets.local);
		}
		if (buckets.session.length > 0) {
			await this.execute('remove', 'session', buckets.session);
		}
	}

	static async clear(area: StorageArea = 'session'): Promise<void> {
		await this.execute('clear', area);
	}

	static async clearSession(): Promise<void> {
		await this.execute('clear', 'session');

		const dynamicKeys = Object.entries(this.KEY_CHART)
			.filter(([_, val]) => val === 'dynamic')
			.map(([k, _]) => k);

		await this.execute('remove', 'local', [
			...dynamicKeys,
			this.KEYS.ENCRYPTED_VAULT,
		]);
	}

	private static async resolveArea(key: string): Promise<StorageArea> {
		const chartValue = this.KEY_CHART[key];
		if (chartValue && chartValue !== 'dynamic') {
			return chartValue;
		}
		return this.detectArea();
	}

	static async detectArea(): Promise<StorageArea> {
		const now = Date.now();
		if (this.strategyCache.val && now < this.strategyCache.expiry) {
			return this.strategyCache.val;
		}

		const strategy = await this.execute('get', 'local', [
			this.KEYS.LOCKOUT_STRATEGY,
		]);
		const val = strategy?.[this.KEYS.LOCKOUT_STRATEGY];
		const res = val === 'Persistent' ? 'local' : 'session';

		this.strategyCache = {
			val: res,
			expiry: now + 5000,
		};

		return res;
	}

	static invalidateStrategyCache(): void {
		this.strategyCache = { val: null, expiry: 0 };
	}

	private static async execute(
		method: string,
		area: StorageArea,
		...args: any[]
	): Promise<any> {
		if (!browserApi || !browserApi.storage) {
			return this.webFallback(method, area, ...args);
		}

		const handle = this.getAreaHandle(area);
		if (!handle || typeof handle[method] !== 'function') {
			return this.webFallback(method, area, ...args);
		}

		return new Promise((resolve, reject) => {
			try {
				let callbackCalled = false;
				const callback = (res: any) => {
					if (callbackCalled) return;
					callbackCalled = true;
					if (browserApi.runtime?.lastError)
						reject(browserApi.runtime.lastError);
					else resolve(res);
				};

				const result = handle[method](...args, callback);

				if (result && typeof result.then === 'function') {
					result
						.then((res: any) => {
							if (!callbackCalled) {
								callbackCalled = true;
								resolve(res);
							}
						})
						.catch((err: any) => {
							if (!callbackCalled) {
								callbackCalled = true;
								reject(err);
							}
						});
				}
			} catch (err) {
				reject(err);
			}
		});
	}

	private static getAreaHandle(area: StorageArea): any {
		if (area === 'session') {
			return browserApi.storage.session || browserApi.storage.local;
		}
		return browserApi.storage.local;
	}

	private static async webFallback(
		method: string,
		area: StorageArea,
		...args: any[]
	): Promise<any> {
		if (typeof window === 'undefined') return;
		const storage =
			area === 'session' ? window.sessionStorage : window.localStorage;
		if (!storage) return;

		switch (method) {
			case 'get':
				const keys = Array.isArray(args[0]) ? args[0] : [args[0]];
				const result: any = {};
				keys.forEach((k: string) => {
					const val = storage.getItem(k);
					if (val !== null) {
						try {
							result[k] = JSON.parse(val);
						} catch {
							result[k] = val;
						}
					}
				});
				return result;
			case 'set':
				const items = args[0];
				Object.keys(items).forEach((k) => {
					const val =
						typeof items[k] === 'string' ? items[k] : JSON.stringify(items[k]);
					storage.setItem(k, val);
				});
				break;
			case 'remove':
				const toRemove = Array.isArray(args[0]) ? args[0] : [args[0]];
				toRemove.forEach((k: string) => storage.removeItem(k));
				break;
			case 'clear':
				storage.clear();
				break;
		}
	}
}
