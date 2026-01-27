/// <reference types="chrome"/>
import { API_BASE_URL } from '../config';

console.log('[Vaulton Extension] Background Service Worker Initialized');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'preRegister') {
		preRegister()
			.then(sendResponse)
			.catch((err: Error) =>
				sendResponse({ success: false, error: err.message }),
			);
		return true;
	}
	return false;
});

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
		console.error('Pre-register failed:', error);
		return { success: false, error: error.message || 'Unknown error' };
	}
}
