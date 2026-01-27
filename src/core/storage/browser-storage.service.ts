import { Injectable } from '@angular/core';

export type StorageArea = 'local' | 'session';

const browserApi: any =
	(globalThis as any).browser || (globalThis as any).chrome;

@Injectable({ providedIn: 'root' })
export class BrowserStorageService {
	async get(key: string, area: StorageArea = 'session'): Promise<any> {
		const result = await this.execute('get', area, [key]);
		return result ? result[key] : undefined;
	}

	async set(
		key: string,
		value: any,
		area: StorageArea = 'session',
	): Promise<void> {
		await this.execute('set', area, { [key]: value });
	}

	async setMultiple(
		items: { [key: string]: any },
		area: StorageArea = 'session',
	): Promise<void> {
		await this.execute('set', area, items);
	}

	async getMultiple(
		keys: string[],
		area: StorageArea = 'session',
	): Promise<{ [key: string]: any }> {
		return (await this.execute('get', area, keys)) || {};
	}

	async remove(key: string, area: StorageArea = 'session'): Promise<void> {
		await this.execute('remove', area, [key]);
	}

	async removeMultiple(
		keys: string[],
		area: StorageArea = 'session',
	): Promise<void> {
		await this.execute('remove', area, keys);
	}

	async clear(area: StorageArea = 'session'): Promise<void> {
		await this.execute('clear', area);
	}

	private log(message: string, level: 'info' | 'error' = 'info'): void {
		const msg = `[Vaulton Storage] ${message}`;
		console.log(msg);
		if (typeof window !== 'undefined' && browserApi?.runtime?.sendMessage) {
			try {
				browserApi.runtime.sendMessage({
					action: 'remoteLog',
					message: msg,
					level,
				});
			} catch (e) {}
		}
	}

	private async execute(
		method: string,
		area: StorageArea,
		...args: any[]
	): Promise<any> {
		if (!browserApi || !browserApi.storage) {
			this.log(
				`Web Fallback: Using window.${area === 'session' ? 'session' : 'local'}Storage`,
			);
			return this.webFallback(method, area, ...args);
		}

		const handle = this.getAreaHandle(area);
		const isSession = handle === browserApi.storage.session;
		this.log(
			`[${method}] API Handle: ${isSession ? 'session' : 'local'} (Namespace: ${!!(globalThis as any).browser ? 'browser' : 'chrome'})`,
		);

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

	private getAreaHandle(area: StorageArea): any {
		if (area === 'session') {
			return browserApi.storage.session || browserApi.storage.local;
		}
		return browserApi.storage.local;
	}

	private async webFallback(
		method: string,
		area: StorageArea,
		...args: any[]
	): Promise<any> {
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
