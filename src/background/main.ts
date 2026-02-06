/// <reference types="chrome"/>
import { BackgroundAuthManager } from './auth-manager';
import { browserApi } from '../core/storage/storage-core';
import { BackgroundAction, BackgroundResponse } from '../core/messaging';
import { loadVault } from '../core/vault/vault-storage';
import { apiPreRegister } from '../core/api/auth-api.client';
import { getBaseDomain } from '../core/utils/domain';
import { StorageCore } from '../core/storage/storage-core';

const auth = new BackgroundAuthManager();

console.log('[Vaulton Background] Service Worker Initializing...');

browserApi.runtime.onInstalled.addListener(() => {
	console.log('[Vaulton Background] Installed/Updated: Setting up alarms.');
	browserApi.alarms.clearAll();
	browserApi.alarms.create('vault-sync', { periodInMinutes: 15 });
});

browserApi.alarms.onAlarm.addListener((alarm: any) => {
	if (alarm.name === 'vault-sync') {
		auth.syncVault();
	} else if (alarm.name === 'auto-lock') {
		console.log('[Background] Auto-lock triggered. Logging out.');
		auth.logout();
	}
});

browserApi.storage.onChanged.addListener((changes: { [key: string]: any }) => {
	const keys = StorageCore.KEYS;
	if (changes[keys.ACCESS_TOKEN] && !changes[keys.ACCESS_TOKEN].newValue) {
		if (changes[keys.REFRESH_TOKEN] && !changes[keys.REFRESH_TOKEN].newValue) {
			return;
		}
		auth.refreshTokens();
	}

	if (changes[keys.LOCKOUT_STRATEGY]) {
		StorageCore.invalidateStrategyCache();
		auth.resetLockTimer();
	}

	if (changes[keys.VAULT_KEY] && !changes[keys.VAULT_KEY].newValue) {
		const newToken = changes[keys.ACCESS_TOKEN]?.newValue;
		if (newToken) return;
		auth.isLocked().then((locked) => {
			if (!locked) auth.clearSession();
		});
	}

	if (
		changes[StorageCore.KEYS.VAULT_SESSION_KEY] &&
		!changes[StorageCore.KEYS.VAULT_SESSION_KEY].newValue
	) {
		auth.syncVault();
	}
});

browserApi.runtime.onMessage.addListener(
	(
		request: BackgroundAction,
		_sender: any,
		sendResponse: (res: BackgroundResponse) => void,
	) => {
		auth.resetLockTimer();

		handleAction(request)
			.then((data) => sendResponse({ success: true, data }))
			.catch((err) => {
				console.error('[Background] Action failed:', err);
				sendResponse({ success: false, error: err.message });
			});
		return true;
	},
);

async function handleAction(action: BackgroundAction): Promise<any> {
	switch (action.type) {
		case 'LOGIN_START':
			return auth.startLogin(action.payload.accountId, action.payload.verifier);
		case 'LOGIN_COMPLETE':
			return auth.completeLogin(action.payload.vaultKeyB64);
		case 'LOGOUT':
			return auth.logout();
		case 'REFRESH':
			return auth.refreshTokens();
		case 'SYNC_VAULT':
			return auth.syncVault(action.payload?.force);
		case 'CLEAR_SESSION':
			return auth.clearSession();
		case 'PRE_REGISTER':
			return preRegister();
		case 'RESET_TIMER':
			return Promise.resolve();
		case 'GET_CREDENTIALS':
			return getCredentialsForDomain(action.payload.domain);
		case 'CHECK_CREDENTIAL_EXISTS':
			return checkCredentialExists(
				action.payload.domain,
				action.payload.username,
				action.payload.password,
			);
		case 'SAVE_CREDENTIAL':
			return saveCredential(
				action.payload.domain,
				action.payload.username,
				action.payload.password,
			);
		case 'SET_PENDING_SAVE':
			return auth.setPendingSavePrompt(action.payload.domain, {
				domain: action.payload.domain,
				username: action.payload.username,
				password: action.payload.password,
				action: action.payload.action,
			});
		case 'GET_PENDING_SAVE':
			return auth.getPendingSavePrompt(action.payload.domain);
		case 'CLEAR_PENDING_SAVE':
			return auth.clearPendingSavePrompt(action.payload.domain);
		case 'ADD_TO_EXCLUSIONS':
			return auth.addToExclusions(action.payload.domain);
		case 'REMOVE_EXCLUSION':
			return auth.removeExclusion(action.payload.domain);
		case 'GET_EXCLUSIONS':
			return auth.getExclusions();
		default:
			throw new Error(`Unknown action: ${(action as any).type}`);
	}
}

async function getCredentialsForDomain(
	domain: string,
): Promise<{ credentials: any[]; locked: boolean }> {
	try {
		if (await auth.isLocked()) {
			return { credentials: [], locked: true };
		}

		const vault = await loadVault();
		if (!vault || vault.length === 0) {
			return { credentials: [], locked: false };
		}

		const mapRecord = (record: any) => ({
			id: record.id,
			title: record.title,
			username: record.username,
			password: record.password,
			website: record.website,
		});

		if (!domain) {
			return {
				credentials: vault.map(mapRecord),
				locked: false,
			};
		}

		const normalized = getBaseDomain(domain);
		const filtered = vault
			.filter((record: any) => {
				const recordDomain = getBaseDomain(record.website || '');
				return recordDomain === normalized;
			})
			.map(mapRecord);

		return { credentials: filtered, locked: false };
	} catch (e) {
		console.error('[Background] Get credentials error:', e);
		return { credentials: [], locked: false };
	}
}

async function checkCredentialExists(
	domain: string,
	username: string,
	password: string,
): Promise<{ action: 'save' | 'update' | 'ignore'; recordId?: string }> {
	try {
		if (await auth.isLocked()) {
			return { action: 'ignore' };
		}

		const vault = await loadVault();
		if (!vault || vault.length === 0) {
			return { action: 'save' };
		}

		const baseDomain = getBaseDomain(domain);

		const domainRecords = vault.filter((record: any) => {
			return getBaseDomain(record.website || '') === baseDomain;
		});

		const existingRecord = domainRecords.find(
			(r: any) => r.username === username,
		);

		if (!existingRecord) {
			return { action: 'save' };
		}

		if (existingRecord.password === password) {
			return { action: 'ignore' };
		}

		return { action: 'update', recordId: existingRecord.id };
	} catch (e) {
		console.error('[Background] Check credential exists error:', e);
		return { action: 'save' };
	}
}

async function saveCredential(
	domain: string,
	username: string,
	password: string,
): Promise<void> {
	try {
		await auth.saveAndUploadCredential(domain, username, password);
	} catch (e) {
		console.error('[Background] Save credential error:', e);
		throw e;
	}
}

async function preRegister(): Promise<any> {
	return apiPreRegister();
}
