/**
 * Community feature constants. All magic strings for the message board
 * live here so we don't scatter them across components and API routes.
 */

export const COMMUNITY_CONFIG = {
  /** MongoDB collection name for messages */
  COLLECTION: 'messages',

  /** Default channel — everything uses this until we add a channel switcher */
  DEFAULT_CHANNEL: 'general',

  /** How many messages to fetch per page */
  PAGE_SIZE: 50,

  /**
   * Polling interval in milliseconds for the feed.
   * Swap this out for Pusher/Ably when we move off Vercel serverless.
   */
  POLL_INTERVAL_MS: 6000,
} as const;
