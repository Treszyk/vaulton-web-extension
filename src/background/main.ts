/// <reference types="chrome"/>
import { BackgroundAuthManager } from './auth-manager';
import { browserApi } from '../core/storage/storage-core';
import { BackgroundAction, BackgroundResponse } from '../core/messaging';
import { API_BASE_URL } from '../config';

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
	if (changes['AccessToken'] && !changes['AccessToken'].newValue) {
		if (changes['RefreshToken'] && !changes['RefreshToken'].newValue) {
			return;
		}
		auth.refreshTokens();
	}

	if (changes['LockoutStrategy']) {
		console.log(
			`[Background] LockoutStrategy changed: ${changes['LockoutStrategy'].newValue}`,
		);
		auth.resetLockTimer();
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
			return auth.completeLogin(
				action.payload.vaultKeyB64,
				action.payload.tagKeyB64,
			);
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
		default:
			throw new Error(`Unknown action: ${(action as any).type}`);
	}
}

async function getCredentialsForDomain(
	domain: string,
): Promise<{ credentials: any[]; locked: boolean }> {
	try {
		const sessionKeyB64 =
			await browserApi.storage.session.get('VaultSessionKey');
		if (!sessionKeyB64.VaultSessionKey) {
			return { credentials: [], locked: true };
		}

		const vault = await auth.getDecryptedVault();
		if (!vault || vault.length === 0) {
			return { credentials: [], locked: false };
		}

		const normalized = domain.toLowerCase().replace(/^www\./, '');
		const filtered = vault
			.filter((record: any) => {
				const recordDomain = (record.website || '')
					.toLowerCase()
					.replace(/^www\./, '');
				return (
					recordDomain.includes(normalized) || normalized.includes(recordDomain)
				);
			})
			.map((record: any) => ({
				id: record.id,
				title: record.title,
				username: record.username,
				password: record.password,
				website: record.website,
			}));

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
		const vault = await auth.getDecryptedVault();
		if (!vault || vault.length === 0) {
			return { action: 'save' };
		}

		const baseDomain = domain.toLowerCase().replace(/^www\./, '');

		const domainRecords = vault.filter((record: any) => {
			const recordDomain = (record.website || '')
				.toLowerCase()
				.replace(/^www\./, '');
			const parts = recordDomain.split('.');
			const recordBase =
				parts.length > 1 ? parts.slice(-2).join('.') : recordDomain;
			return recordBase === baseDomain || recordDomain === baseDomain;
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
	const response = await fetch(`${API_BASE_URL}/auth/pre-register`, {
		method: 'POST',
	});
	if (!response.ok) throw new Error(`Pre-register failed: ${response.status}`);
	return response.json();
}
