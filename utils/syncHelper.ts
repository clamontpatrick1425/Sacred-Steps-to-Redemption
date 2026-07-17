import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';
import type { SavedEntries, JournalResponses } from '../types';

/**
 * Interface representing the Firestore Journal doc structure.
 */
interface FirestoreJournalDoc {
  userId: string;
  week: number;
  content: string; // JSON string of JournalResponses
  createdAt: string;
}

/**
 * Synchronizes the user's weekly journal responses between LocalStorage and Firestore.
 * Performs a robust two-way merge so the user never loses data.
 */
export async function syncJournalEntries(
  uid: string,
  localEntries: SavedEntries,
  onSyncComplete: (merged: SavedEntries) => void
): Promise<void> {
  try {
    // 1. Fetch all journal entries from Firestore
    const journalCollection = collection(db, 'journalEntries');
    const q = query(journalCollection, where('userId', '==', uid));
    const querySnapshot = await getDocs(q);

    const cloudEntries: SavedEntries = {};
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as FirestoreJournalDoc;
      if (data && typeof data.week === 'number' && typeof data.content === 'string') {
        try {
          const parsed = JSON.parse(data.content) as Partial<JournalResponses>;
          cloudEntries[data.week] = parsed;
        } catch (e) {
          console.error(`Failed to parse journal entry for week ${data.week}`, e);
        }
      }
    });

    // 2. Perform a state merge
    const mergedEntries: SavedEntries = { ...localEntries };
    const uploadPromises: Promise<void>[] = [];

    // Loop through all 52 weeks to ensure completeness
    for (let week = 1; week <= 52; week++) {
      const localEntry = localEntries[week];
      const cloudEntry = cloudEntries[week];

      if (localEntry && !cloudEntry) {
        // Local exists but cloud doesn't -> Upload local version
        uploadPromises.push(saveJournalDocToCloud(uid, week, localEntry));
      } else if (cloudEntry && !localEntry) {
        // Cloud exists but local doesn't -> Sync down to local
        mergedEntries[week] = cloudEntry;
      } else if (localEntry && cloudEntry) {
        // Both exist -> Merge fields intelligently, preferring most filled values
        const mergedFields: Partial<JournalResponses> = { ...cloudEntry };
        let hasNewEdits = false;

        const allKeys = new Set<keyof JournalResponses>([
          ...(Object.keys(localEntry) as (keyof JournalResponses)[]),
          ...(Object.keys(cloudEntry) as (keyof JournalResponses)[])
        ]);

        for (const key of allKeys) {
          const localVal = localEntry[key] || '';
          const cloudVal = cloudEntry[key] || '';

          if (localVal.trim().length > cloudVal.trim().length) {
            mergedFields[key] = localVal;
            hasNewEdits = true;
          } else {
            mergedFields[key] = cloudVal;
          }
        }

        mergedEntries[week] = mergedFields;

        if (hasNewEdits) {
          uploadPromises.push(saveJournalDocToCloud(uid, week, mergedFields));
        }
      }
    }

    // Wait for any missing uploads to complete
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    // Call state updater
    onSyncComplete(mergedEntries);
  } catch (error) {
    console.error('Failed to sync journal entries with Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.GET, 'journalEntries');
    } catch (err) {
      throw err;
    }
  }
}

/**
 * Saves a single week's journal entry responses to Firestore.
 */
export async function saveJournalDocToCloud(
  uid: string,
  week: number,
  responses: Partial<JournalResponses>
): Promise<void> {
  const docId = `${uid}_${week}`;
  const docRef = doc(db, 'journalEntries', docId);

  try {
    await setDoc(docRef, {
      userId: uid,
      week,
      content: JSON.stringify(responses),
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(`Error writing journal entry for week ${week} to Firestore:`, err);
    try {
      handleFirestoreError(err, OperationType.WRITE, `journalEntries/${docId}`);
    } catch (handled) {
      throw handled;
    }
  }
}

/**
 * Synchronizes user profile records and matches state assets such as Privacy PIN.
 */
export async function syncUserProfile(
  uid: string,
  email: string,
  name: string,
  localPin: string | null,
  onPinSynced: (pin: string) => void
): Promise<void> {
  const userRef = doc(db, 'users', uid);

  try {
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
      // Create user profile in Firestore
      await setDoc(userRef, {
        uid,
        email,
        name,
        pinLock: localPin || '',
        createdAt: new Date().toISOString()
      });
    } else {
      const data = docSnap.data();
      const cloudPin = data?.pinLock || '';

      // Merge Privacy PIN logic
      if (!localPin && cloudPin) {
        localStorage.setItem('privacyPin', cloudPin);
        onPinSynced(cloudPin);
      } else if (localPin && !cloudPin) {
        await setDoc(userRef, {
          ...data,
          pinLock: localPin
        });
      }
    }
  } catch (err) {
    console.error('Error syncing user profile with Firestore:', err);
    try {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    } catch (handled) {
      throw handled;
    }
  }
}
