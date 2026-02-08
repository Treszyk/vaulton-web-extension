export const THROTTLES = {
	/**
	 * Background Sync (Initial/Startup)
	 * Standard vault fetch on service worker wake-up.
	 */
	VAULT_SYNC: 300000, // 5 minutes

	/**
	 * Scheduled Background Sync (Alarm)
	 * The interval at which the background alarm triggers a forced sync.
	 */
	BACKGROUND_SYNC_INTERVAL_MINUTES: 15,

	/**
	 * Foreground Session Heartbeat (Popup Open)
	 * Standard periodic check when the user interacts with the extension.
	 */
	SESSION_HEARTBEAT: 300000, // 5 minutes

	/**
	 * Security Verification (Show/Copy Secrets & Autofill)
	 * Squashed freshness check for all data-revealing actions.
	 */
	SESSION_SECURITY_CHECK: 60000, // 1 minute

	/**
	 * Activity Reset Throttle
	 */
	ACTIVITY_RESET: 30000, // 30 seconds
};
