import {
	Component,
	EventEmitter,
	Input,
	Output,
	signal,
	effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type {
	VaultRecord,
	VaultRecordInput,
} from '../../../core/vault/vault-record.model';
import { generateSecurePassword } from '../../../core/crypto/password-utils';

@Component({
	selector: 'app-record-editor',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './record-editor.component.html',
	styleUrls: ['./record-editor.component.css'],
})
export class RecordEditorComponent {
	@Input() record?: VaultRecord;
	@Input() loading = false;
	@Output() save = new EventEmitter<VaultRecordInput>();
	@Output() close = new EventEmitter<void>();

	form: VaultRecordInput = {
		title: '',
		website: '',
		username: '',
		password: '',
		notes: '',
	};

	showPwd = signal(false);
	isClosing = signal(false);

	constructor() {
		effect(() => {
			if (this.record) {
				this.form = {
					title: this.record.title,
					website: this.record.website,
					username: this.record.username,
					password: this.record.password,
					notes: this.record.notes,
				};
			} else {
				this.form = {
					title: '',
					website: '',
					username: '',
					password: '',
					notes: '',
				};
			}
		});
	}

	isValid() {
		return this.form.title && this.form.username && this.form.password;
	}

	triggerClose() {
		if (this.isClosing()) return;
		this.isClosing.set(true);
		setTimeout(() => {
			this.close.emit();
			this.isClosing.set(false);
		}, 300);
	}

	generatePassword() {
		this.form.password = generateSecurePassword(20);
		this.showPwd.set(true);
	}

	async submit(event: Event) {
		event.preventDefault();
		if (!this.isValid() || this.loading) return;
		this.save.emit({ ...this.form });
	}
}
