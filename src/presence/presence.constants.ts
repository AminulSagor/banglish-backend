/**
 * Presence Configuration Constants
 *
 * Adjust these values based on your requirements:
 * - Lower values = more accurate presence, more server load
 * - Higher values = less accurate presence, less server load
 */

/**
 * How long (in minutes) before a user is considered offline
 * if no heartbeat is received.
 *
 * Recommended: 5-10 minutes
 *
 * Examples:
 * - 5 = User marked offline after 5 minutes of no heartbeat
 * - 60 = User marked offline after 1 hour
 * - 300 = User marked offline after 5 hours
 */
export const PRESENCE_TIMEOUT_MINUTES = 5;

/**
 * How often (in minutes) the cleanup job runs to mark stale users offline.
 * Should be less than or equal to PRESENCE_TIMEOUT_MINUTES.
 *
 * Recommended: Same as PRESENCE_TIMEOUT_MINUTES or half of it
 */
export const PRESENCE_CLEANUP_INTERVAL_MINUTES = 5;

/**
 * Frontend should send heartbeat at this interval (in minutes).
 * Should be less than PRESENCE_TIMEOUT_MINUTES to ensure user stays online.
 *
 * Recommended: PRESENCE_TIMEOUT_MINUTES / 2
 *
 * Example: If timeout is 5 min, frontend should heartbeat every 2-3 min
 */
export const RECOMMENDED_HEARTBEAT_INTERVAL_MINUTES =
  Math.floor(PRESENCE_TIMEOUT_MINUTES / 2) || 1;
