export function getBaseDomain(url: string): string {
	if (!url) return '';

	try {
		let workingUrl = url;
		if (!url.includes('://')) {
			workingUrl = 'https://' + url;
		}

		const hostname = new URL(workingUrl).hostname.toLowerCase();
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
