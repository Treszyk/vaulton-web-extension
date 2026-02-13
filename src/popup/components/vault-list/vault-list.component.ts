import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VaultService } from '../../../core/vault/vault.service';
import {
	VaultRecord,
	VaultRecordInput,
} from '../../../core/vault/vault-record.model';
import { VaultDetailModalComponent } from '../vault-detail-modal/vault-detail-modal.component';
import { RecordEditorComponent } from '../record-editor/record-editor.component';
import { NotificationService } from '../../../core/ui/notification.service';

@Component({
	selector: 'app-vault-list',
	standalone: true,
	imports: [CommonModule, VaultDetailModalComponent, RecordEditorComponent],
	templateUrl: './vault-list.component.html',
	styleUrls: ['./vault-list.component.css'],
})
export class VaultListComponent {
	private vaultService = inject(VaultService);
	private notifications = inject(NotificationService);
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

	selectedRecord = signal<VaultRecord | null>(null);
	isModalOpen = signal(false);
	isEditorOpen = signal(false);

	onSearch(event: any) {
		this.searchQuery.set(event.target.value);
	}

	onOpenRecord(record: VaultRecord) {
		this.selectedRecord.set(record);
		this.isModalOpen.set(true);
	}

	onAddNew() {
		this.selectedRecord.set(null);
		this.isEditorOpen.set(true);
	}

	onStartEdit(_record: VaultRecord) {
		this.isEditorOpen.set(true);
		setTimeout(() => {
			this.isModalOpen.set(false);
		}, 100);
	}

	async onSaveRecord(input: VaultRecordInput) {
		try {
			const record = this.selectedRecord();
			if (record) {
				await this.vaultService.updateRecord(record.id, input);
				this.notifications.success('Record updated');
			} else {
				await this.vaultService.addRecord(input);
				this.notifications.success('New record saved');
			}
			this.onCloseEditor();
		} catch (e) {
			this.notifications.error('Failed to save record');
			this.onCloseEditor();
		}
	}

	async onDeleteRecord(id: string) {
		try {
			await this.vaultService.deleteRecord(id);
			this.notifications.success('Record deleted');
			this.onCloseModal();
		} catch (e) {
			this.notifications.error('Failed to delete record');
			this.onCloseModal();
		}
	}

	onCloseModal() {
		this.isModalOpen.set(false);
		this.selectedRecord.set(null);
	}

	onCloseEditor() {
		this.isEditorOpen.set(false);
		this.selectedRecord.set(null);
	}
}
