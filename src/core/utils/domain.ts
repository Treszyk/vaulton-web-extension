export function getBaseDomain(url: string): string {
	try {
		const hostname = new URL(url).hostname.toLowerCase();
		const withoutWww = hostname.replace(/^www\./, '');

		if (
			withoutWww === 'localhost' ||
			/^\d{1,3}(\.\d{1,3}){3}$/.test(withoutWww)
		) {
			return withoutWww;
		}

		const parts = withoutWww.split('.');

		if (parts.length <= 1) {
			return withoutWww;
		}

		return parts.slice(-2).join('.');
	} catch (e) {
		console.error('[Vaulton] Failed to extract base domain:', e);
		return '';
	}
}

export function normalizeWebsite(website: string): string {
	if (!website) return '';

	if (!website.startsWith('http://') && !website.startsWith('https://')) {
		website = 'https://' + website;
	}

	return getBaseDomain(website);
}
