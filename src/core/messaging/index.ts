export type BackgroundAction =
	| {
			type: 'LOGIN_START';
			payload: {
				accountId: string;
				verifier: string;
			};
	  }
	| {
			type: 'LOGIN_COMPLETE';
			payload: {
				vaultKeyB64: string;
			};
	  }
	| { type: 'LOGOUT' }
	| { type: 'LOGOUT_ALL' }
	| { type: 'WIPE_ALL' }
	| { type: 'REFRESH' }
	| { type: 'SYNC_VAULT'; payload: { force?: boolean } }
	| { type: 'CLEAR_SESSION' }
	| { type: 'PRE_REGISTER' }
	| { type: 'RESET_TIMER' }
	| { type: 'GET_CREDENTIALS'; payload: { domain: string } }
	| {
			type: 'CHECK_CREDENTIAL_EXISTS';
			payload: { domain: string; username: string; password: string };
	  }
	| {
			type: 'SAVE_CREDENTIAL';
			payload: { domain: string; username: string; password: string };
	  }
	| {
			type: 'SET_PENDING_SAVE';
			payload: {
				domain: string;
				username: string;
				password: string;
				action: 'save' | 'update';
			};
	  }
	| {
			type: 'GET_PENDING_SAVE';
			payload: { domain: string };
	  }
	| {
			type: 'CLEAR_PENDING_SAVE';
			payload: { domain: string };
	  }
	| { type: 'ADD_TO_EXCLUSIONS'; payload: { domain: string } }
	| { type: 'REMOVE_EXCLUSION'; payload: { domain: string } }
	| { type: 'GET_EXCLUSIONS' }
	| { type: 'VERIFY_SESSION'; payload: { throttleMs: number } };

export interface BackgroundResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
}

export function sendCommand<T = any>(
	action: BackgroundAction,
): Promise<BackgroundResponse<T>> {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage(action, (res) => resolve(res));
	});
}
