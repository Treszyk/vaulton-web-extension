export class OverlayManager {
	private static shadowRoot: ShadowRoot | null = null;

	static getShadowRoot(): ShadowRoot {
		if (this.shadowRoot) return this.shadowRoot;

		const host = document.createElement('div');
		host.id = 'vaulton-overlay-host';
		host.style.cssText = `
			position: fixed !important;
			top: 0 !important;
			left: 0 !important;
			width: 0 !important;
			height: 0 !important;
			z-index: 2147483647 !important;
			pointer-events: none !important;
		`;
		document.body.appendChild(host);
		this.shadowRoot = host.attachShadow({ mode: 'open' });

		this.injectGlobalStyles();

		return this.shadowRoot;
	}

	private static injectGlobalStyles(): void {
		if (!this.shadowRoot) return;

		const style = document.createElement('style');
		style.textContent = `
			:host {
				all: initial !important;
			}
			
			@keyframes vaultonPickerSlideIn {
				from {
					opacity: 0;
					transform: translateY(-8px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}

			@keyframes vaultonPickerSlideOut {
				from {
					opacity: 1;
					transform: translateY(0);
				}
				to {
					opacity: 0;
					transform: translateY(-8px);
				}
			}

			@keyframes vaultonSlideIn {
				from {
					opacity: 0;
					transform: translateX(100px);
				}
				to {
					opacity: 1;
					transform: translateX(0);
				}
			}

			@keyframes vaultonSlideOut {
				from {
					opacity: 1;
					transform: translateX(0);
				}
				to {
					opacity: 0;
					transform: translateX(100px);
				}
			}

			.vaulton-credential-picker::-webkit-scrollbar {
				width: 6px;
			}
			.vaulton-credential-picker::-webkit-scrollbar-track {
				background: transparent;
			}
			.vaulton-credential-picker::-webkit-scrollbar-thumb {
				background: #27272a;
				border-radius: 99px;
			}
			.vaulton-credential-picker::-webkit-scrollbar-thumb:hover {
				background: #3f3f46;
			}

			* {
				box-sizing: border-box !important;
			}
		`;
		this.shadowRoot.appendChild(style);
	}

	static clear(): void {
		if (this.shadowRoot) {
			const styles = this.shadowRoot.querySelectorAll('style');
			this.shadowRoot.innerHTML = '';
			styles.forEach((s) => this.shadowRoot?.appendChild(s));
		}
	}
}
