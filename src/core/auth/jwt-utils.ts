export function decodeJwtPayload(token: string): any {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;

		let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');

		while (b64.length % 4 !== 0) {
			b64 += '=';
		}

		const json = atob(b64);
		return JSON.parse(json);
	} catch (e) {
		console.error('[JWT] Failed to decode token:', e);
		return null;
	}
}

export function getAccountIdFromToken(token: string): string | null {
	const payload = decodeJwtPayload(token);
	return payload?.sub || null;
}
