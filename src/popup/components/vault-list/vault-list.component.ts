import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VaultService } from '../../../core/vault/vault.service';
import { VaultRecord } from '../../../core/vault/vault-record.model';

@Component({
	selector: 'app-vault-list',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div class="list-container">
			<div class="search-bar">
				<div class="search-wrapper">
					<svg
						class="search-icon"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input
						type="text"
						placeholder="Search vault..."
						(input)="onSearch($event)"
						[value]="searchQuery()" />
				</div>
			</div>

			<div
				class="loading-state"
				*ngIf="isLoading()">
				<div class="spinner"></div>
			</div>

			<div
				class="records-list"
				*ngIf="!isLoading() && filteredRecords().length > 0">
				<div
					class="record-item"
					*ngFor="let record of filteredRecords(); let i = index"
					[style.animation-delay]="i * 50 + 'ms'"
					(click)="onOpenRecord(record)">
					<div class="record-icon">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
						</svg>
					</div>
					<div class="record-info">
						<div class="record-title">{{ record.title }}</div>
						<div class="record-meta">
							<span class="record-subtitle">{{ record.username }}</span>
							<span
								class="dot-separator"
								*ngIf="record.username && record.website"
								>·</span
							>
							<span
								class="record-website"
								*ngIf="record.website"
								>{{ record.website }}</span
							>
						</div>
					</div>
					<div class="record-actions">
						<button
							class="action-btn"
							(click)="onCopy(record, 'password', $event)">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
							</svg>
						</button>
					</div>
				</div>
			</div>

			<div
				class="empty-placeholder"
				*ngIf="!isLoading() && filteredRecords().length === 0">
				<div class="empty-content">
					<svg
						class="large-icon"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<p *ngIf="searchQuery(); else noRecords">
						No matches found for "{{ searchQuery() }}"
					</p>
					<ng-template #noRecords>
						<p>Your vault is empty.</p>
					</ng-template>
				</div>
			</div>
		</div>
	`,
	styles: [
		`
			:host {
				display: block;
				height: 100%;
			}

			.list-container {
				display: flex;
				flex-direction: column;
				height: 100%;
				overflow: hidden;
			}

			.search-bar {
				padding: 16px 24px 0 24px;
			}

			.search-wrapper {
				position: relative;
				display: flex;
				align-items: center;
			}

			.search-icon {
				position: absolute;
				left: 14px;
				width: 14px;
				height: 14px;
				color: rgba(255, 255, 255, 0.2);
				pointer-events: none;
			}

			.loading-state {
				flex: 1;
				display: flex;
				align-items: center;
				justify-content: center;
				min-height: 200px;
			}

			.spinner {
				width: 24px;
				height: 24px;
				border: 2px solid rgba(255, 255, 255, 0.1);
				border-top-color: #7c3aed;
				border-radius: 50%;
				animation: spin 0.8s linear infinite;
			}

			@keyframes spin {
				to {
					transform: rotate(360deg);
				}
			}

			.search-bar input {
				flex: 1;
				background: rgba(38, 38, 38, 0.9);
				border: 1px solid rgba(255, 255, 255, 0.1);
				border-radius: 12px;
				padding: 10px 14px 10px 38px;
				color: white;
				font-family: 'Inter', sans-serif;
				font-size: 13px;
				outline: none;
				transition: all 0.2s;
			}

			.search-bar input:focus {
				border-color: rgba(124, 58, 237, 0.6);
				background: rgba(38, 38, 38, 0.8);
				box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15);
			}

			.records-list {
				padding: 16px 24px;
				display: flex;
				flex-direction: column;
				gap: 12px;
				flex: 1;
				overflow-y: overlay;
				min-height: 0;
			}

			.record-item {
				display: flex;
				align-items: center;
				padding: 14px;
				background: #18181b;
				border: 1px solid #27272a;
				border-radius: 18px;
				cursor: pointer;
				transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

				opacity: 0;
				animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
			}

			@keyframes fadeInUp {
				from {
					opacity: 0;
					transform: translateY(10px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}

			.record-item:hover {
				background: #27272a;
				border-color: #3f3f46;
				transform: translateY(-2px);
				box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
			}

			.record-icon {
				width: 40px;
				height: 40px;
				border-radius: 12px;
				background: rgba(124, 58, 237, 0.1);
				display: flex;
				align-items: center;
				justify-content: center;
				color: #a78bfa;
				margin-right: 12px;
			}

			.record-icon svg {
				width: 20px;
				height: 20px;
			}

			.record-info {
				flex: 1;
				min-width: 0;
			}

			.record-title {
				color: white;
				font-weight: 700;
				font-size: 14px;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.record-meta {
				display: flex;
				align-items: center;
				gap: 6px;
				margin-top: 2px;
			}

			.record-subtitle {
				color: #f4f4f5;
				font-size: 12px;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				font-weight: 500;
			}

			.record-website {
				color: #c084fc;
				font-size: 11px;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.dot-separator {
				color: rgba(255, 255, 255, 0.1);
				font-size: 12px;
			}

			.record-actions {
				display: flex;
				gap: 4px;
			}

			.action-btn {
				width: 32px;
				height: 32px;
				border-radius: 8px;
				background: transparent;
				border: none;
				color: rgba(255, 255, 255, 0.3);
				display: flex;
				align-items: center;
				justify-content: center;
				cursor: pointer;
				transition: all 0.2s;
			}

			.action-btn svg {
				width: 18px;
				height: 18px;
			}

			.action-btn:hover {
				color: white;
				background: rgba(255, 255, 255, 0.1);
				transform: scale(1.1);
			}

			.empty-placeholder {
				padding-top: 60px;
				display: flex;
				flex-direction: column;
				align-items: center;
				color: var(--v-text-dim);
				text-align: center;
				gap: 12px;
			}

			.large-icon {
				width: 48px;
				height: 48px;
				color: rgba(255, 255, 255, 0.1);
			}
		`,
	],
})
export class VaultListComponent {
	private vaultService = inject(VaultService);
	isLoading = this.vaultService.isLoading;

	searchQuery = signal('');

	filteredRecords = computed(() => {
		const query = this.searchQuery().toLowerCase();
		const all = this.vaultService.records();
		if (!query) return all;

		return all.filter(
			(r) =>
				r.title.toLowerCase().includes(query) ||
				r.username.toLowerCase().includes(query) ||
				r.website.toLowerCase().includes(query),
		);
	});

	onSearch(event: any) {
		this.searchQuery.set(event.target.value);
	}

	onOpenRecord(record: VaultRecord) {
		console.log('Open record', record.id);
	}

	onCopy(record: VaultRecord, field: keyof VaultRecord, event: MouseEvent) {
		event.stopPropagation();
		const val = record[field];
		if (typeof val === 'string') {
			navigator.clipboard.writeText(val);
		}
	}
}
