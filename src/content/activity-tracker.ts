import { browserApi } from '../core/storage/storage-core';

let lastResetTime = 0;
const THROTTLE_MS = 30000;

export function resetAutoLockTimer(): void {
	const now = Date.now();
	if (now - lastResetTime < THROTTLE_MS) return;

	lastResetTime = now;
	browserApi.runtime.sendMessage({ type: 'RESET_TIMER' }).catch(() => {});
}
