export type KdfMode = 1 | 2 | 3;

export interface EncryptedValueDto {
	Nonce: string;
	CipherText: string;
	Tag: string;
}

export type WorkerRequest =
	| {
			type: 'LOGIN';
			payload: {
				passwordBuffer: ArrayBuffer;
				saltB64: string;
				kdfMode: number;
			};
	  }
	| {
			type: 'FINALIZE_LOGIN';
			payload: {
				MkWrapPwd: EncryptedValueDto;
				CryptoSchemaVer: number;
				AccountId: string;
			};
	  }
	| { type: 'CLEAR_KEYS' }
	| { type: 'CHECK_STATUS' }
	| {
			type: 'UNLOCK';
			payload: {
				passwordBuffer: ArrayBuffer;
				saltB64: string;
				kdfMode: number;
				MkWrapPwd: EncryptedValueDto;
				CryptoSchemaVer: number;
				AccountId: string;
			};
	  }
	| {
			type: 'ENCRYPT_ENTRY';
			payload: {
				plaintextBuffer: ArrayBuffer;
				aadB64: string;
				domain?: string;
			};
	  }
	| {
			type: 'DECRYPT_ENTRY';
			payload: { dto: EncryptedValueDto; aadB64: string };
	  }
	| {
			type: 'ACTIVATE_PASSCODE';
			payload: {
				passwordBuffer: ArrayBuffer;
				masterSaltB64: string;
				masterKdfMode: number;
				passcodeBuffer: ArrayBuffer;
				accountId: string;
				mkWrapPwd: EncryptedValueDto;
				schemaVer: number;
			};
	  }
	| {
			type: 'UNLOCK_VIA_PASSCODE';
			payload: {
				passcodeBuffer: ArrayBuffer;
				saltB64: string;
				mkWrapLocal: EncryptedValueDto;
				accountId: string;
			};
	  }
	| {
			type: 'BENCHMARK_KDF';
			payload: {
				passwordBuffer: ArrayBuffer;
				saltBuffer: ArrayBuffer;
				kdfMode: number;
			};
	  };

export interface WorkerResponseEnvelope<T> {
	id: string;
	ok: boolean;
	result?: T;
	error?: string;
}

export interface WorkerMessage<T> {
	id: string;
	payload: T;
}

export interface EncryptedEntryResult {
	DomainTag: string;
	Payload: EncryptedValueDto;
}

export interface DecryptEntryResult {
	ptBuffer: ArrayBuffer;
}

export interface CheckStatusResponse {
	isUnlocked: boolean;
}
