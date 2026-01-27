import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth/auth.service';

const browserApi: any =
	(globalThis as any).browser || (globalThis as any).chrome;

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div style="width: 300px; padding: 16px; font-family: sans-serif;">
			<h3>Vaulton Extension</h3>

			<div *ngIf="auth.isAuthenticated()">
				<p style="color: green;">Logged in as: {{ auth.accountId() }}</p>
			</div>

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
export class AppComponent implements OnInit {
	loading = false;
	result: any = null;
	auth = inject(AuthService);

	constructor(private cdr: ChangeDetectorRef) {}

	ngOnInit() {
		this.auth.init().then(() => {
			console.log('[Vaulton Popup] AuthService initialization complete.');
			this.cdr.detectChanges();
		});
	}

	onPreRegister() {
		this.loading = true;
		this.result = null;

		browserApi.runtime.sendMessage(
			{ action: 'preRegister' },
			(response: any) => {
				this.loading = false;
				if (browserApi.runtime.lastError) {
					this.result = {
						success: false,
						error: browserApi.runtime.lastError.message,
					};
				} else {
					this.result = response;
				}
				this.cdr.detectChanges();
			},
		);
	}
}
