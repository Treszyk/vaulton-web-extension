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
				tagKeyB64: string;
			};
	  }
	| { type: 'LOGOUT' }
	| { type: 'REFRESH' }
	| { type: 'SYNC_VAULT'; payload: { force?: boolean } }
	| { type: 'CLEAR_SESSION' }
	| { type: 'PRE_REGISTER' };

export interface BackgroundResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
}
