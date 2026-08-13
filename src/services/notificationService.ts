import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { hasRealFirebase, db } from './firebase';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests notification permission and returns the Expo push token.
 * Returns null if running on a simulator, permission denied, or Firebase not configured.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[NotificationService] Must use physical device for push notifications.');
    return null;
  }

  // Check / request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[NotificationService] Permission not granted for push notifications.');
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? 'f0fc3243-6428-47db-a41b-6c5243136f14',
    });
    console.log('[NotificationService] Expo push token:', tokenData.data);
    return tokenData.data;
  } catch (err) {
    console.error('[NotificationService] Failed to get push token:', err);
    return null;
  }
}

/**
 * Schedules an immediate local notification (shown on-device without internet).
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: true,
      },
      trigger: null, // fire immediately
    });
  } catch (err) {
    console.error('[NotificationService] Failed to schedule local notification:', err);
  }
}

/**
 * Fetches all user documents with an expoPushToken from Firestore and sends
 * a push notification to each via the Expo Push API.
 */
export async function sendPushToAllMembers(title: string, body: string, targetAreas?: string[]): Promise<void> {
  if (!hasRealFirebase || !db) {
    console.log('[NotificationService] Firebase not available; skipping push broadcast. Triggering local notification fallback.');
    // Fallback to local notification in mock mode so the user gets a live demo notification on screen
    sendLocalNotification(title, body).catch(() => {});
    return;
  }

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('expoPushToken', '!=', null));
    const snapshot = await getDocs(q);

    const tokens: string[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const token = data.expoPushToken as string | undefined;
      const userArea = data.area as string | undefined;

      if (token && token.startsWith('ExponentPushToken[')) {
        // If targetAreas is provided and not empty, check if user belongs to one of those areas
        if (!targetAreas || targetAreas.length === 0 || (userArea && targetAreas.includes(userArea))) {
          tokens.push(token);
        }
      }
    });

    if (tokens.length === 0) {
      console.log('[NotificationService] No push tokens found matching target area criteria.');
      return;
    }

    // Batch into groups of 100 (Expo Push API limit per request)
    const chunkSize = 100;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      const messages = chunk.map((token) => ({
        to: token,
        title,
        body,
        sound: 'default',
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[NotificationService] Expo Push API error:', errText);
      } else {
        console.log(`[NotificationService] Sent push to ${chunk.length} devices.`);
      }
    }
  } catch (err) {
    console.error('[NotificationService] sendPushToAllMembers failed:', err);
  }
}

/**
 * Saves (upserts) the Expo push token into the user's Firestore document.
 */
export async function savePushTokenToFirestore(uid: string, token: string): Promise<void> {
  if (!hasRealFirebase || !db) {
    console.log('[NotificationService] Firebase not available; cannot save push token.');
    return;
  }

  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { expoPushToken: token });
    console.log('[NotificationService] Push token saved for user:', uid);
  } catch (err) {
    console.error('[NotificationService] Failed to save push token:', err);
  }
}

// Re-export Notifications so callers can add listeners via this module if needed
export { Notifications };
