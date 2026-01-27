import { API_BASE_URL } from './config.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'preRegister') {
		preRegister()
			.then(sendResponse)
			.catch((err) => sendResponse({ success: false, error: err.message }));
		return true;
	}
});

async function preRegister() {
	try {
		// using /api prefix because we are going through the frontend proxy (localhost:4200) as a workaround
		const response = await fetch(`${API_BASE_URL}/api/auth/pre-register`, {
			method: 'POST',
		});

		if (!response.ok) {
			throw new Error(
				`Server returned ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();
		return { success: true, data };
	} catch (error) {
		console.error('Pre-register failed:', error);
		return { success: false, error: error.message };
	}
}
