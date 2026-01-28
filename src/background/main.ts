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
		default:
			throw new Error(`Unknown action: ${(action as any).type}`);
	}
}

async function preRegister(): Promise<any> {
	const response = await fetch(`${API_BASE_URL}/auth/pre-register`, {
		method: 'POST',
	});
	if (!response.ok) throw new Error(`Pre-register failed: ${response.status}`);
	return response.json();
}
