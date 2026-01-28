/// <reference types="chrome"/>
import { API_BASE_URL } from '../config';
import { BackgroundAuthManager } from './auth-manager';
import { browserApi } from '../core/storage/storage-core';

const auth = new BackgroundAuthManager();

console.log('[Vaulton Background] Service Worker Initializing...');

browserApi.alarms.create('token-refresh', { periodInMinutes: 15 });

browserApi.alarms.onAlarm.addListener((alarm: any) => {
	if (alarm.name === 'token-refresh') {
		auth.refreshTokens();
	}
});

browserApi.runtime.onMessage.addListener(
	(request: any, _sender: any, sendResponse: any) => {
		if (request.action === 'preRegister') {
			preRegister()
				.then(sendResponse)
				.catch((err: Error) =>
					sendResponse({ success: false, error: err.message }),
				);
			return true;
		}

		if (request.action === 'refreshToken') {
			auth
				.refreshTokens()
				.then((success) => sendResponse({ success }))
				.catch((err) => sendResponse({ success: false, error: err.message }));
			return true;
		}

		if (request.action === 'remoteLog') {
			console.log(`[Popup remote log] ${request.message}`);
			return false;
		}

		return false;
	},
);

async function preRegister(): Promise<{
	success: boolean;
	data?: any;
	error?: string;
}> {
	try {
		const response = await fetch(`${API_BASE_URL}/auth/pre-register`, {
			method: 'POST',
		});

		if (!response.ok) {
			throw new Error(
				`Server returned ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();
		return { success: true, data };
	} catch (error: any) {
		return { success: false, error: error.message || 'Unknown error' };
	}
}
