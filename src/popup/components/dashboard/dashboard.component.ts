import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../../core/auth/session.service';

@Component({
	selector: 'app-dashboard',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './dashboard.component.html',
	styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
	@Input() loading = false;
	@Output() refresh = new EventEmitter<void>();
	@Output() logout = new EventEmitter<void>();
	@Output() checkStatus = new EventEmitter<void>();
	@Output() wipeData = new EventEmitter<void>();

	auth = inject(SessionService);

	onRefresh() {
		this.refresh.emit();
	}
	onLogout() {
		this.logout.emit();
	}
	onCheckStatus() {
		this.checkStatus.emit();
	}
	onWipeData() {
		this.wipeData.emit();
	}
}
