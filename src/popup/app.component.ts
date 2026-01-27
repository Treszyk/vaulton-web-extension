import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div style="width: 300px; padding: 16px; font-family: sans-serif;">
			<h3>Vaulton Extension</h3>
			<p>Test backend connection:</p>

			<button
				(click)="onPreRegister()"
				[disabled]="loading"
				style="width: 100%; padding: 8px; cursor: pointer;">
				{{ loading ? 'Connecting...' : 'Pre-Register (Get Account ID)' }}
			</button>

			<div
				*ngIf="result"
				style="margin-top: 12px; word-break: break-all;"
				[style.color]="result.success ? 'green' : 'red'">
				<strong *ngIf="result.success">Success! Account ID:</strong>
				<strong *ngIf="!result.success">Error:</strong>
				{{ result.data?.AccountId || result.error }}
			</div>
		</div>
	`,
	styles: [],
})
export class AppComponent {
	loading = false;
	result: any = null;

	constructor(private cdr: ChangeDetectorRef) {}

	onPreRegister() {
		console.log('[Popup] Test Connection clicked. Sending message...');
		this.loading = true;
		this.result = null;

		chrome.runtime.sendMessage({ action: 'preRegister' }, (response: any) => {
			console.log('[Popup] Received response:', response);
			console.log('[Popup] Runtime error:', chrome.runtime.lastError);
			this.loading = false;
			if (chrome.runtime.lastError) {
				this.result = {
					success: false,
					error: chrome.runtime.lastError.message,
				};
			} else {
				this.result = response;
			}
			this.cdr.detectChanges();
		});
	}
}
