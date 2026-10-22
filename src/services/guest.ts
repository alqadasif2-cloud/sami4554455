import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { CurrentUser, saveUserSession } from '../data/auth';

export interface GuestIdentity {
  guestId: string;
  guestNumber: number;
  displayName: string;
  secretToken: string;
  isBlocked: boolean;
  createdAt: number;
  lastActiveAt: number;
  notes?: string;
}

export interface GuestSupportConfig {
  id: string;
  enabledModeratorIds: number[]; // backward compatibility
  guestModeratorIds: number[]; // moderators for general guest messages
  defaultModeratorId: number | null;
  isSupportEnabled: boolean;
  packageModeratorIds: number[]; // moderators for subscriptions & package inquiries
  defaultPackageModeratorId: number | null;
  isPackageSupportEnabled: boolean;
  inactiveModeratorIds: number[]; // moderators who are temporarily unavailable/inactive for new chats
  updatedAt: number;
  updatedBy: number;
}

const GUEST_DEVICE_TOKEN_KEY = 'sami_guest_device_token_v1';
const GUEST_IDENTITIES_COLLECTION = 'guest_identities';
const GUEST_SUPPORT_CONFIG_DOC = 'guest_support_config/main';
const GUEST_COUNTER_DOC = 'counters/guest_number';

export const DEFAULT_GUEST_SUPPORT_CONFIG: GuestSupportConfig = {
  id: 'main',
  enabledModeratorIds: [1], // Sami by default
  guestModeratorIds: [1],
  defaultModeratorId: 1,
  isSupportEnabled: true,
  packageModeratorIds: [1],
  defaultPackageModeratorId: 1,
  isPackageSupportEnabled: true,
  inactiveModeratorIds: [],
  updatedAt: Date.now(),
  updatedBy: 1,
};

/**
 * Reads the permanent device-bound guest token from secure local storage.
 * This ensures that closing the app, restarting the device, or logging out
 * and clicking "الدخول كضيف" returns to the EXACT SAME guest identity!
 */
export function getDeviceGuestIdentity(): {
  guestId: string;
  guestNumber: number;
  secretToken: string;
} | null {
  try {
    const raw = localStorage.getItem(GUEST_DEVICE_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.guestId && parsed.guestNumber && parsed.secretToken) {
      return {
        guestId: String(parsed.guestId),
        guestNumber: Number(parsed.guestNumber),
        secretToken: String(parsed.secretToken),
      };
    }
  } catch {
    // Ignore local storage error
  }
  return null;
}

export function saveDeviceGuestIdentity(data: {
  guestId: string;
  guestNumber: number;
  secretToken: string;
}): void {
  try {
    localStorage.setItem(GUEST_DEVICE_TOKEN_KEY, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

/**
 * Authenticates or restores the persistent Guest user.
 * 1. If an existing device guest token is found, verifies it in Firestore and restores it.
 * 2. If no identity is found, atomically generates a sequential guest number (starting from 1001)
 *    and registers the new guest in Firestore.
 */
export async function loginOrRestoreGuest(): Promise<CurrentUser> {
  const existing = getDeviceGuestIdentity();

  if (existing) {
    try {
      const docRef = doc(db, GUEST_IDENTITIES_COLLECTION, `guest_${existing.guestId}`);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data.isBlocked) {
          throw new Error('تم تعطيل حساب الضيف هذا بواسطة الإدارة.');
        }

        // Update lastActiveAt
        updateDoc(docRef, { lastActiveAt: Date.now() }).catch(() => {});

        const currentUser: CurrentUser = {
          id: 9000000 + existing.guestNumber,
          username: `guest_${existing.guestNumber}`,
          displayName: `ضيف رقم ${existing.guestNumber}`,
          role: 'guest',
          isGuest: true,
          guestId: existing.guestId,
          guestNumber: existing.guestNumber,
          loginTimestamp: Date.now(),
        };

        saveUserSession(currentUser);
        return currentUser;
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('تعطيل')) {
        throw err;
      }
      // If network is offline, restore from local device identity safely
    }

    // Local restoration fallback
    const offlineUser: CurrentUser = {
      id: 9000000 + existing.guestNumber,
      username: `guest_${existing.guestNumber}`,
      displayName: `ضيف رقم ${existing.guestNumber}`,
      role: 'guest',
      isGuest: true,
      guestId: existing.guestId,
      guestNumber: existing.guestNumber,
      loginTimestamp: Date.now(),
    };
    saveUserSession(offlineUser);
    return offlineUser;
  }

  // --- BRAND NEW GUEST ON THIS DEVICE ---
  // Atomically allocate next sequential guestNumber from Firestore starting at 1001
  let allocatedNumber = 1001;
  const now = Date.now();
  const counterRef = doc(db, GUEST_COUNTER_DOC);

  try {
    allocatedNumber = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      let currentNumber = 1000;
      if (counterSnap.exists()) {
        currentNumber = Number(counterSnap.data()?.lastGuestNumber || 1000);
      }
      const nextNumber = currentNumber + 1;
      transaction.set(counterRef, { lastGuestNumber: nextNumber }, { merge: true });
      return nextNumber;
    });
  } catch (err) {
    console.warn('Transaction fallback for guest counter:', err);
    // Fallback pseudo-counter based on timestamp if offline
    allocatedNumber = 1001 + Math.floor(Math.random() * 899);
  }

  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const guestId = `g_${allocatedNumber}_${now}_${randomSuffix}`;
  const secretToken =
    Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

  const guestData: GuestIdentity = {
    guestId,
    guestNumber: allocatedNumber,
    displayName: `ضيف رقم ${allocatedNumber}`,
    secretToken,
    isBlocked: false,
    createdAt: now,
    lastActiveAt: now,
  };

  try {
    await setDoc(doc(db, GUEST_IDENTITIES_COLLECTION, `guest_${guestId}`), guestData);
  } catch (err) {
    console.warn('Could not save guest to Firestore immediately:', err);
  }

  // Save device token so any future reopen or logout->guest returns to THIS exact guest!
  saveDeviceGuestIdentity({
    guestId,
    guestNumber: allocatedNumber,
    secretToken,
  });

  const newGuestUser: CurrentUser = {
    id: 9000000 + allocatedNumber,
    username: `guest_${allocatedNumber}`,
    displayName: `ضيف رقم ${allocatedNumber}`,
    role: 'guest',
    isGuest: true,
    guestId,
    guestNumber: allocatedNumber,
    loginTimestamp: now,
  };

  saveUserSession(newGuestUser);
  return newGuestUser;
}

/**
 * Real-time listener for guest support configuration.
 */
export function subscribeToGuestSupportConfig(
  callback: (config: GuestSupportConfig) => void
): () => void {
  try {
    const unsub = onSnapshot(
      doc(db, GUEST_SUPPORT_CONFIG_DOC),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const legacyIds = Array.isArray(data.enabledModeratorIds) ? data.enabledModeratorIds : [1];
          callback({
            id: 'main',
            enabledModeratorIds: legacyIds,
            guestModeratorIds: Array.isArray(data.guestModeratorIds)
              ? data.guestModeratorIds
              : legacyIds,
            defaultModeratorId:
              typeof data.defaultModeratorId === 'number' ? data.defaultModeratorId : 1,
            isSupportEnabled:
              typeof data.isSupportEnabled === 'boolean' ? data.isSupportEnabled : true,
            packageModeratorIds: Array.isArray(data.packageModeratorIds)
              ? data.packageModeratorIds
              : legacyIds,
            defaultPackageModeratorId:
              typeof data.defaultPackageModeratorId === 'number'
                ? data.defaultPackageModeratorId
                : 1,
            isPackageSupportEnabled:
              typeof data.isPackageSupportEnabled === 'boolean'
                ? data.isPackageSupportEnabled
                : true,
            inactiveModeratorIds: Array.isArray(data.inactiveModeratorIds)
              ? data.inactiveModeratorIds
              : [],
            updatedAt: Number(data.updatedAt || Date.now()),
            updatedBy: Number(data.updatedBy || 1),
          });
        } else {
          callback(DEFAULT_GUEST_SUPPORT_CONFIG);
        }
      },
      () => {
        callback(DEFAULT_GUEST_SUPPORT_CONFIG);
      }
    );
    return unsub;
  } catch {
    callback(DEFAULT_GUEST_SUPPORT_CONFIG);
    return () => {};
  }
}

/**
 * Saves guest support configuration (accessible by Owner Sami only).
 */
export async function saveGuestSupportConfig(
  config: Partial<GuestSupportConfig>,
  ownerUser: { id: number; displayName: string }
): Promise<void> {
  if (ownerUser.id !== 1) {
    throw new Error('غير مصرح لك بتعديل إعدادات دعم الضيوف.');
  }

  const payload = {
    id: 'main',
    enabledModeratorIds: config.guestModeratorIds || config.enabledModeratorIds || [1],
    guestModeratorIds: config.guestModeratorIds || [1],
    defaultModeratorId: config.defaultModeratorId ?? 1,
    isSupportEnabled: config.isSupportEnabled ?? true,
    packageModeratorIds: config.packageModeratorIds || [1],
    defaultPackageModeratorId: config.defaultPackageModeratorId ?? 1,
    isPackageSupportEnabled: config.isPackageSupportEnabled ?? true,
    inactiveModeratorIds: config.inactiveModeratorIds || [],
    updatedAt: Date.now(),
    updatedBy: 1,
  };

  await setDoc(doc(db, GUEST_SUPPORT_CONFIG_DOC), payload, { merge: true });
}

/**
 * Real-time listener for all guest identities for Owner Sami.
 */
export function subscribeToAllGuestIdentities(
  callback: (guests: GuestIdentity[]) => void
): () => void {
  try {
    const q = query(
      collection(db, GUEST_IDENTITIES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list: GuestIdentity[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            guestId: String(data.guestId || d.id.replace('guest_', '')),
            guestNumber: Number(data.guestNumber || 0),
            displayName: String(data.displayName || `ضيف رقم ${data.guestNumber}`),
            secretToken: String(data.secretToken || ''),
            isBlocked: Boolean(data.isBlocked),
            createdAt: Number(data.createdAt || Date.now()),
            lastActiveAt: Number(data.lastActiveAt || Date.now()),
            notes: data.notes ? String(data.notes) : undefined,
          });
        });
        callback(list);
      },
      (err) => {
        console.warn('Guest identities listener error:', err);
        callback([]);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * Toggles a guest's block status (Owner Sami only).
 */
export async function toggleBlockGuest(
  guestId: string,
  isBlocked: boolean,
  ownerUser: { id: number }
): Promise<void> {
  if (ownerUser.id !== 1) {
    throw new Error('صلاحية محصورة بالمالك SAMI.');
  }
  await updateDoc(doc(db, GUEST_IDENTITIES_COLLECTION, `guest_${guestId}`), {
    isBlocked,
    lastActiveAt: Date.now(),
  });
}

/**
 * Generates the contextual opening message for guest support according to the user specifications.
 */
export function getGuestOpeningMessage(
  context: 'dashboard' | 'channels' | 'subscriptions' | 'history' | 'roadmap' | 'settings',
  guestNumber: number,
  extraDetails?: string
): string {
  switch (context) {
    case 'dashboard':
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأرغب في الاستفسار عن التطبيق.`;
    case 'history':
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأرغب في الاستفسار عن سجل الصفقات.`;
    case 'roadmap':
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأرغب في الاستفسار عن المحطات.`;
    case 'settings':
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأرغب في الاستفسار عن الإعدادات.`;
    case 'subscriptions':
      if (extraDetails) {
        return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأود الاستفسار عن باقة ${extraDetails}.`;
      }
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأود الاستفسار عن الباقات والاشتراكات.`;
    case 'channels':
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأود الاستفسار عن القنوات الخاصة وشروط الاشتراك.`;
    default:
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأرغب في الاستفسار عن التطبيق.`;
  }
}
