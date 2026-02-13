import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
	id: number;
	type: NotificationType;
	message: string;
	isClosing?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
	private readonly _notifications = signal<Notification[]>([]);
	readonly notifications = this._notifications.asReadonly();

	private nextId = 0;

	show(message: string, type: NotificationType = 'info', duration = 3000) {
		const current = this._notifications();
		if (current.length >= 3) {
			const oldestNonClosing = current.find((n) => !n.isClosing);
			if (oldestNonClosing) {
				this.remove(oldestNonClosing.id);
			}
		}

		const id = this.nextId++;
		const notification: Notification = { id, message, type, isClosing: false };

		this._notifications.update((n) => [...n, notification]);

		if (duration > 0) {
			setTimeout(() => this.remove(id), duration);
		}
	}

	success(message: string, duration = 3000) {
		this.show(message, 'success', duration);
	}

	error(message: string, duration = 5000) {
		this.show(message, 'error', duration);
	}

	warning(message: string, duration = 4000) {
		this.show(message, 'warning', duration);
	}

	info(message: string, duration = 3000) {
		this.show(message, 'info', duration);
	}

	remove(id: number) {
		const current = this._notifications();
		const index = current.findIndex((n) => n.id === id);
		if (index === -1 || current[index].isClosing) return;

		this._notifications.update((list) =>
			list.map((n) => (n.id === id ? { ...n, isClosing: true } : n)),
		);

		setTimeout(() => {
			this._notifications.update((list) => list.filter((n) => n.id !== id));
		}, 300);
	}
}
