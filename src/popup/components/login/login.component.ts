import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../../core/auth/session.service';

@Component({
	selector: 'app-login',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './login.component.html',
	styleUrls: ['./login.component.css'],
})
export class LoginComponent {
	@Input() loading = false;
	@Output() login = new EventEmitter<{ email: string; password: string }>();
	@Output() togglePersistence = new EventEmitter<boolean>();

	email = '';
	password = '';
	auth = inject(SessionService);

	onLogin() {
		if (this.email && this.password) {
			this.login.emit({ email: this.email, password: this.password });
		}
	}

	onTogglePersistence(val: boolean) {
		this.togglePersistence.emit(val);
	}
}
