export function isTokenExpired(expiresAt: string | null): boolean {
	if (!expiresAt) return true;
	const expiry = new Date(expiresAt).getTime();

	return Date.now() >= expiry - 30000;
}
