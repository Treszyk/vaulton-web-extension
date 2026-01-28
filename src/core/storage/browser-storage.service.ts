import { Injectable } from '@angular/core';
import { StorageCore, StorageArea } from './storage-core';

@Injectable({ providedIn: 'root' })
export class BrowserStorageService {
	async get(key: string, area: StorageArea = 'session'): Promise<any> {
		this.log(`[get] key: ${key}, area: ${area}`);
		return StorageCore.get(key, area);
	}

	async set(
		key: string,
		value: any,
		area: StorageArea = 'session',
	): Promise<void> {
		this.log(`[set] key: ${key}, area: ${area}`);
		await StorageCore.set(key, value, area);
	}

	async setMultiple(
		items: { [key: string]: any },
		area: StorageArea = 'session',
	): Promise<void> {
		this.log(`[setMultiple] keys: ${Object.keys(items)}, area: ${area}`);
		await StorageCore.setMultiple(items, area);
	}

	async getMultiple(
		keys: string[],
		area: StorageArea = 'session',
	): Promise<{ [key: string]: any }> {
		this.log(`[getMultiple] keys: ${keys}, area: ${area}`);
		return StorageCore.getMultiple(keys, area);
	}

	async remove(key: string, area: StorageArea = 'session'): Promise<void> {
		this.log(`[remove] key: ${key}, area: ${area}`);
		await StorageCore.remove(key, area);
	}

	async removeMultiple(
		keys: string[],
		area: StorageArea = 'session',
	): Promise<void> {
		this.log(`[removeMultiple] keys: ${keys}, area: ${area}`);
		await StorageCore.removeMultiple(keys, area);
	}

	async clear(area: StorageArea = 'session'): Promise<void> {
		this.log(`[clear] area: ${area}`);
		await StorageCore.clear(area);
	}

	async getSmart(key: string): Promise<any> {
		this.log(`[getSmart] key: ${key}`);
		return StorageCore.getSmart(key);
	}

	async getSmartMultiple(keys: string[]): Promise<{ [key: string]: any }> {
		this.log(`[getSmartMultiple] keys: ${keys}`);
		return StorageCore.getSmartMultiple(keys);
	}

	async setSmart(key: string, value: any): Promise<void> {
		this.log(`[setSmart] key: ${key}`);
		await StorageCore.setSmart(key, value);
	}

	async removeSmart(key: string): Promise<void> {
		this.log(`[removeSmart] key: ${key}`);
		await StorageCore.removeSmart(key);
	}

	private log(message: string, _level: 'info' | 'error' = 'info'): void {
		const msg = `[Vaulton Storage] ${message}`;
		console.log(msg);
	}
}
