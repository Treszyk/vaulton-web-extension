export function getTrustedPolicy(): any {
	const win = window as any;
	if (!win.trustedTypes || !win.trustedTypes.createPolicy) {
		return {
			createHTML: (s: string) => s,
			createScriptURL: (s: string) => s,
		};
	}

	try {
		return win.trustedTypes.createPolicy('vaulton-policy', {
			createHTML: (s: string) => s,
			createScriptURL: (url: string) => {
				if (url.startsWith('blob:') || url.startsWith('data:')) return url;

				try {
					const parsed = new URL(url, document.baseURI);

					if (
						parsed.origin !== window.location.origin &&
						!url.startsWith('chrome-extension:')
					) {
						throw new Error(
							'Cross-origin worker scripts are blocked by policy.',
						);
					}

					if (
						!parsed.pathname.endsWith('.js') &&
						!parsed.pathname.endsWith('.mjs') &&
						!parsed.pathname.endsWith('.ts')
					) {
						throw new Error('Worker script must be a valid JavaScript file.');
					}

					return url;
				} catch (e) {
					if (url.startsWith('data:')) return url;
					throw new Error(`Invalid worker URL: ${url}`);
				}
			},
		});
	} catch (e) {
		return (
			win.trustedTypes
				.getPolicies?.()
				.find((p: any) => p.name === 'vaulton-policy') || {
				createHTML: (s: string) => s,
				createScriptURL: (s: string) => s,
			}
		);
	}
}

export const vaultonPolicy = getTrustedPolicy();
