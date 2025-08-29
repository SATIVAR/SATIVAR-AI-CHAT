
'use server';

// Simple in-memory store status (in a real app, this would be in the database)
let storeStatus = {
  isOpen: true, // Default to open for testing
  openedAt: new Date(),
  closedAt: null as Date | null,
};

interface StoreStatusResult {
  isOpen: boolean;
  openedAt: Date | null;
  closedAt: Date | null;
}

export async function getStoreStatus(): Promise<StoreStatusResult> {
  return {
    isOpen: storeStatus.isOpen,
    openedAt: storeStatus.openedAt,
    closedAt: storeStatus.closedAt,
  };
}

export async function toggleStoreStatus(shouldBeOpen: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    if (shouldBeOpen) {
      storeStatus = {
        isOpen: true,
        openedAt: new Date(),
        closedAt: null,
      };
    } else {
      storeStatus = {
        ...storeStatus,
        isOpen: false,
        closedAt: new Date(),
      };
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error toggling store status:', error);
    return { success: false, error: 'Failed to update store status.' };
  }
}
