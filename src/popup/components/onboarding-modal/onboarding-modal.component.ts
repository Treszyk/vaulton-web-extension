import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-onboarding-modal',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div class="modal-overlay">
			<div class="modal-sheet">
				<div class="modal-header">
					<div class="header-main">
						<div class="onboarding-icon">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
						</div>
						<div class="header-text">
							<h2 class="modal-title">Welcome to Vaulton</h2>
							<p class="modal-subtitle">
								We can automatically detect login forms and offer to save or
								autofill your credentials
								<strong
									>(this feature is experimental and may not work on all
									websites)</strong
								>.
							</p>
							<p class="modal-subtitle-small">
								You can change this later in <strong>Account Settings</strong>.
							</p>
						</div>
					</div>
				</div>

				<div class="modal-footer">
					<button
						class="footer-btn btn-confirm"
						(click)="selectOption(true)">
						Enable Autofill
					</button>
					<button
						class="footer-btn btn-cancel"
						(click)="selectOption(false)">
						Manual Only
					</button>
				</div>
			</div>
		</div>
	`,
	styles: [
		`
			.modal-overlay {
				position: fixed;
				inset: 0;
				background: rgba(0, 0, 0, 0.9);
				backdrop-filter: blur(12px);
				-webkit-backdrop-filter: blur(12px);
				display: flex;
				align-items: center;
				justify-content: center;
				z-index: 5000;
				padding: 20px;
				animation: modalFadeIn 0.3s ease-out;
			}

			@keyframes modalFadeIn {
				from {
					opacity: 0;
				}
				to {
					opacity: 1;
				}
			}

			.modal-sheet {
				width: 100%;
				max-width: 320px;
				background: transparent;
				border: none;
				border-radius: 2rem;
				padding: 24px;
				animation: modalScaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
			}

			@keyframes modalScaleUp {
				from {
					opacity: 0;
					transform: scale(0.95) translateY(10px);
				}
				to {
					opacity: 1;
					transform: scale(1) translateY(0);
				}
			}

			.modal-header {
				margin-bottom: 24px;
			}

			.header-main {
				display: flex;
				flex-direction: column;
				align-items: center;
				text-align: center;
				gap: 16px;
			}

			.onboarding-icon {
				width: 56px;
				height: 56px;
				border-radius: 1.25rem;
				background: #18181b;
				border: 1px solid #27272a;
				display: flex;
				align-items: center;
				justify-content: center;
				color: #a78bfa;
				box-shadow: 0 0 20px rgba(124, 58, 237, 0.1);
			}

			.onboarding-icon svg {
				width: 28px;
				height: 28px;
			}

			.header-text {
				display: flex;
				flex-direction: column;
				gap: 8px;
			}

			.modal-title {
				font-size: 1.125rem;
				font-weight: 950;
				color: white;
				margin: 0;
				letter-spacing: -0.01em;
			}

			.modal-subtitle {
				font-size: 0.8125rem;
				color: #d4d4d8;
				margin: 0;
				line-height: 1.5;
			}

			.modal-subtitle-small {
				font-size: 0.6875rem;
				color: #a1a1aa;
				margin: 0;
			}

			.modal-footer {
				display: flex;
				flex-direction: column;
				gap: 12px;
			}

			.footer-btn {
				padding: 14px;
				border-radius: 1rem;
				font-size: 0.75rem;
				font-weight: 950;
				text-transform: uppercase;
				letter-spacing: 0.1em;
				cursor: pointer;
				transition: all 0.2s;
				border: 1px solid transparent;
				width: 100%;
			}

			.btn-confirm {
				background: #7c3aed;
				color: white;
				border: none;
				box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
			}

			.btn-confirm:hover {
				background: #8b5cf6;
				transform: translateY(-1px);
				box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
			}

			.btn-cancel {
				background: #18181b;
				border-color: #27272a;
				color: #a1a1aa;
			}

			.btn-cancel:hover {
				background: #27272a;
				border-color: #3f3f46;
				color: white;
				transform: translateY(-1px);
			}
		`,
	],
})
export class OnboardingModalComponent {
	@Output() choice = new EventEmitter<boolean>();

	selectOption(enabled: boolean) {
		this.choice.emit(enabled);
	}
}
