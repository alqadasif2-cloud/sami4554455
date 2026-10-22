/**
 * Firebase Cloud Messaging (FCM) & Device Token Manager
 * Supports:
 * - Android Native FCM Token Sync via Javascript Interface
 * - Web Push Token Registration
 * - Device Token Lifecycle (Login, Switch Account, Logout)
 * - Deep Link Routing for Messages, Channels, and Sami Direct Chats
 */

import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

const FCM_TOKENS_COLLECTION = 'user_fcm_tokens';
const DEVICE_ID_STORAGE_KEY = 'sami_device_unique_id';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'unknown_device';
  let devId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!devId) {
    devId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, devId);
  }
  return devId;
}

/**
 * Registers an FCM token for the currently logged-in user in Firestore.
 */
export async function registerUserFcmToken(
  userId: number,
  username: string,
  token: string,
  platform: 'android' | 'web' = 'android'
): Promise<void> {
  if (!userId || !token) return;
  const deviceId = getOrCreateDeviceId();
  const docId = `token_${userId}_${deviceId}`;
  const now = Date.now();

  try {
    await setDoc(
      doc(db, FCM_TOKENS_COLLECTION, docId),
      {
        id: docId,
        token,
        userId,
        username,
        deviceId,
        platform,
        deviceModel: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'unknown',
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[FCM] Error saving token to Firestore:', err);
  }
}

/**
 * Removes or unlinks the FCM token when a user logs out so this device stops receiving that user's notifications.
 */
export async function unregisterUserFcmToken(userId: number): Promise<void> {
  if (!userId) return;
  const deviceId = getOrCreateDeviceId();
  const docId = `token_${userId}_${deviceId}`;
  try {
    await deleteDoc(doc(db, FCM_TOKENS_COLLECTION, docId));
  } catch {
    // Ignore delete errors
  }
}

/**
 * Checks system notification permissions and returns status.
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests notification permission from user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return 'denied';
  }
}

/**
 * Dispatches deep link navigation event into the app.
 */
export function dispatchNotificationDeepLink(detail: {
  channelId?: string | null;
  partnerId?: number | null;
  chatType?: 'channel' | 'private';
  messageId?: string | null;
  senderName?: string;
}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app_open_chat_message', { detail }));
}

// Global hook for Android WebView to pass FCM token into web layer
if (typeof window !== 'undefined') {
  (window as unknown as { registerAndroidFcmToken: (token: string, userId: number, username: string) => void }).registerAndroidFcmToken = (
    token: string,
    userId: number,
    username: string
  ) => {
    void registerUserFcmToken(userId, username, token, 'android');
  };
}
