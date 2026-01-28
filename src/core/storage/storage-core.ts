export type StorageArea = 'local' | 'session';

export const browserApi: any =
	(globalThis as any).browser || (globalThis as any).chrome;

export class StorageCore {
	static async get(key: string, area: StorageArea = 'session'): Promise<any> {
		const result = await this.execute('get', area, [key]);
		return result ? result[key] : undefined;
	}

	static async set(
		key: string,
		value: any,
		area: StorageArea = 'session',
	): Promise<void> {
		await this.execute('set', area, { [key]: value });
	}

	static async setMultiple(
		items: { [key: string]: any },
		area: StorageArea = 'session',
	): Promise<void> {
		await this.execute('set', area, items);
	}

	static async getMultiple(
		keys: string[],
		area: StorageArea = 'session',
	): Promise<{ [key: string]: any }> {
		return (await this.execute('get', area, keys)) || {};
	}

	static async remove(
		key: string,
		area: StorageArea = 'session',
	): Promise<void> {
		await this.execute('remove', area, [key]);
	}

	static async removeMultiple(
		keys: string[],
		area: StorageArea = 'session',
	): Promise<void> {
		await this.execute('remove', area, keys);
	}

	static async clear(area: StorageArea = 'session'): Promise<void> {
		await this.execute('clear', area);
	}

	static async getSmart(key: string): Promise<any> {
		const area = await this.detectArea();
		return this.get(key, area);
	}

	static async setSmart(key: string, value: any): Promise<void> {
		const area = await this.detectArea();
		await this.set(key, value, area);
	}

	static async removeSmart(key: string): Promise<void> {
		const area = await this.detectArea();
		await this.remove(key, area);
	}

	static async getSmartMultiple(
		keys: string[],
	): Promise<{ [key: string]: any }> {
		const area = await this.detectArea();
		return this.getMultiple(keys, area);
	}

	static async setSmartMultiple(items: { [key: string]: any }): Promise<void> {
		const area = await this.detectArea();
		await this.setMultiple(items, area);
	}

	private static async detectArea(): Promise<StorageArea> {
		const local = await this.get('NeverLockout', 'local');
		return local === true ? 'local' : 'session';
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
