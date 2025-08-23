
'use server';

import { db } from './admin';
import { Timestamp } from 'firebase-admin/firestore';

const STORE_STATUS_DOC_ID = 'main_store_status';

interface StoreStatus {
  isOpen: boolean;
  openedAt: Date | null;
  closedAt: Date | null;
}

export async function getStoreStatus(): Promise<StoreStatus> {
  const docRef = db.collection('storeStatus').doc(STORE_STATUS_DOC_ID);
  const doc = await docRef.get();

  if (!doc.exists) {
    // Default to closed if no document exists
    return { isOpen: false, openedAt: null, closedAt: new Date() };
  }

  const data = doc.data()!;
  return {
    isOpen: data.isOpen,
    openedAt: data.openedAt ? (data.openedAt as Timestamp).toDate() : null,
    closedAt: data.closedAt ? (data.closedAt as Timestamp).toDate() : null,
  };
}

export async function toggleStoreStatus(shouldBeOpen: boolean): Promise<{ success: boolean; error?: string }> {
  const docRef = db.collection('storeStatus').doc(STORE_STATUS_DOC_ID);
  
  try {
    if (shouldBeOpen) {
      await docRef.set({
        isOpen: true,
        openedAt: Timestamp.now(), // Set new opening time
        closedAt: null,
      }, { merge: true });
    } else {
      await docRef.set({
        isOpen: false,
        closedAt: Timestamp.now(),
      }, { merge: true });
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error toggling store status:", error);
    return { success: false, error: 'Failed to update store status.' };
  }
}
