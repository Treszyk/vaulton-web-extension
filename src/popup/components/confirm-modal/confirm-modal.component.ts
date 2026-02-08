import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-confirm-modal',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div
			class="modal-overlay"
			(click)="onCancel()">
			<div
				class="modal-sheet"
				[class.is-closing]="isClosing()"
				(click)="$event.stopPropagation()">
				<div class="modal-header">
					<div class="header-main">
						<div
							class="confirm-icon"
							[class.danger]="isDanger">
							<svg
								*ngIf="isDanger"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
							<svg
								*ngIf="!isDanger"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div class="header-text">
							<h2 class="modal-title">{{ title }}</h2>
							<p class="modal-subtitle">{{ message }}</p>
						</div>
					</div>
				</div>

				<div class="modal-footer">
					<button
						class="footer-btn"
						[class.btn-confirm]="!isDanger"
						[class.btn-danger]="isDanger"
						(click)="onConfirm()">
						{{ confirmLabel }}
					</button>
					<button
						class="footer-btn btn-cancel"
						(click)="onCancel()">
						Cancel
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
				z-index: 3000;
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

			.modal-sheet.is-closing {
				animation: modalScaleDown 0.2s ease-in forwards;
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

			@keyframes modalScaleDown {
				from {
					opacity: 1;
					transform: scale(1) translateY(0);
				}
				to {
					opacity: 0;
					transform: scale(0.95) translateY(10px);
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

			.confirm-icon {
				width: 56px;
				height: 56px;
				border-radius: 1.25rem;
				background: #18181b;
				border: 1px solid #27272a;
				display: flex;
				align-items: center;
				justify-content: center;
				color: #a78bfa;
			}

			.confirm-icon.danger {
				color: #dc2626;
				background: rgba(220, 38, 38, 0.1);
				border-color: rgba(220, 38, 38, 0.2);
			}

			.confirm-icon svg {
				width: 28px;
				height: 28px;
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
				margin: 8px 0 0 0;
				line-height: 1.5;
			}

			.modal-footer {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 12px;
			}

			.footer-btn {
				padding: 12px;
				border-radius: 1rem;
				font-size: 0.75rem;
				font-weight: 950;
				text-transform: uppercase;
				letter-spacing: 0.1em;
				cursor: pointer;
				transition: all 0.2s;
				border: 1px solid transparent;
			}

			.btn-cancel {
				background: #18181b;
				border-color: #27272a;
				color: white;
			}

			.btn-cancel:hover {
				background: #27272a;
				transform: translateY(-1px);
			}

			.btn-confirm {
				background: #0a0a0a;
				border: 1px solid #27272a;
				color: #a78bfa;
			}

			.btn-confirm:hover {
				background: rgba(124, 58, 237, 0.1);
				border-color: rgba(124, 58, 237, 0.2);
				transform: translateY(-1px);
				box-shadow: 0 2px 8px rgba(124, 58, 237, 0.15);
			}

			.btn-danger {
				background: #0a0a0a;
				border: 1px solid #27272a;
				color: #ff4d4d;
			}

			.btn-danger:hover {
				background: rgba(255, 77, 77, 0.05);
				border-color: rgba(255, 77, 77, 0.1);
				color: #ffffff;
				transform: translateY(-1px);
				box-shadow: 0 2px 8px rgba(255, 77, 77, 0.15);
			}
		`,
	],
})
export class ConfirmModalComponent {
	@Input() title = 'Confirm Action';
	@Input() message = 'Are you sure you want to proceed?';
	@Input() confirmLabel = 'Confirm';
	@Input() isDanger = false;

	@Output() confirm = new EventEmitter<void>();
	@Output() cancel = new EventEmitter<void>();

	isClosing = signal(false);

	onConfirm() {
		this.confirm.emit();
	}

	onCancel() {
		this.isClosing.set(true);
		setTimeout(() => {
			this.cancel.emit();
			this.isClosing.set(false);
		}, 200);
	}
}
