import {
	Component,
	EventEmitter,
	Input,
	Output,
	signal,
	OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { SessionService } from '../../../core/auth/session.service';
import { THROTTLES } from '../../../core/config/throttles';
import type { VaultRecord } from '../../../core/vault/vault-record.model';
import { NotificationService } from '../../../core/ui/notification.service';

@Component({
	selector: 'app-vault-detail-modal',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './vault-detail-modal.component.html',
	styleUrls: ['./vault-detail-modal.component.css'],
})
export class VaultDetailModalComponent implements OnDestroy {
	@Input({ required: true }) record!: VaultRecord;
	@Output() closed = new EventEmitter<void>();
	@Output() onEdit = new EventEmitter<VaultRecord>();
	@Output() onDelete = new EventEmitter<string>();

	private session = inject(SessionService);
	private notifications = inject(NotificationService);

	reveal = signal(false);
	copyConfirmActive = signal(false);
	justCopied = signal(false);
	copiedStatus = signal<'username' | 'password' | null>(null);
	deleteConfirmActive = signal(false);
	isClosing = signal(false);

	private deleteTimeout?: any;
	private revealTimeout?: any;
	private copyTimeout?: any;
	private statusTimeout?: any;

	triggerClose() {
		if (this.isClosing()) return;
		this.isClosing.set(true);
		setTimeout(() => {
			this.closed.emit();
			this.isClosing.set(false);
		}, 300);
	}

	triggerEdit() {
		if (this.isClosing()) return;
		this.isClosing.set(true);
		setTimeout(() => {
			this.onEdit.emit(this.record);
		}, 300);
	}

	close() {
		this.triggerClose();
	}

	async toggleReveal() {
		if (this.reveal()) {
			this.reveal.set(false);
			if (this.revealTimeout) clearTimeout(this.revealTimeout);
			return;
		}

		try {
			await this.session.verifySession(THROTTLES.SESSION_SECURITY_CHECK);
			this.reveal.set(true);
			this.revealTimeout = setTimeout(() => this.reveal.set(false), 8000);
		} catch (e) {
			this.notifications.error('Security check failed');
		}
	}

	onDeleteClick(_id: string) {
		if (!this.deleteConfirmActive()) {
			this.deleteConfirmActive.set(true);
			if (this.deleteTimeout) clearTimeout(this.deleteTimeout);
			this.deleteTimeout = setTimeout(
				() => this.deleteConfirmActive.set(false),
				3000,
			);
			return;
		}
		this.triggerDelete();
	}

	triggerDelete() {
		if (this.isClosing()) return;
		this.isClosing.set(true);
		setTimeout(() => {
			this.onDelete.emit(this.record.id);
		}, 300);
	}

	copyUsername(val: string) {
		this.resetFeedback();
		navigator.clipboard.writeText(val);
		this.showFeedback('username');
	}

	async copyPassword(val: string) {
		if (this.justCopied() && this.copiedStatus() === 'password') return;

		if (!this.copyConfirmActive()) {
			this.resetFeedback();
			this.copyConfirmActive.set(true);
			if (this.copyTimeout) clearTimeout(this.copyTimeout);
			this.copyTimeout = setTimeout(
				() => this.copyConfirmActive.set(false),
				3000,
			);
			return;
		}

		try {
			await this.session.verifySession(THROTTLES.SESSION_SECURITY_CHECK);
			navigator.clipboard.writeText(val);
			this.copyConfirmActive.set(false);
			this.showFeedback('password');
		} catch (e) {
			this.notifications.error('Security check failed');
		}
	}

	private resetFeedback() {
		this.copyConfirmActive.set(false);
		this.justCopied.set(false);
		this.copiedStatus.set(null);
		if (this.copyTimeout) clearTimeout(this.copyTimeout);
		if (this.statusTimeout) clearTimeout(this.statusTimeout);
	}

	private showFeedback(type: 'username' | 'password') {
		this.justCopied.set(true);
		this.copiedStatus.set(type);
		if (this.statusTimeout) clearTimeout(this.statusTimeout);
		this.statusTimeout = setTimeout(() => {
			this.justCopied.set(false);
			this.copiedStatus.set(null);
		}, 2000);
	}

	ngOnDestroy() {
		if (this.revealTimeout) clearTimeout(this.revealTimeout);
		if (this.deleteTimeout) clearTimeout(this.deleteTimeout);
		if (this.copyTimeout) clearTimeout(this.copyTimeout);
		if (this.statusTimeout) clearTimeout(this.statusTimeout);
	}
}
