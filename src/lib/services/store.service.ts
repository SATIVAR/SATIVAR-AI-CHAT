
'use server';

import prisma from '@/lib/prisma';
import { StoreStatus } from '@prisma/client';

const STORE_STATUS_RECORD_ID = 'clxsmf0p9000010mbbhkce1s6'; // Use um ID fixo para o registro único

interface StoreStatusResult {
  isOpen: boolean;
  openedAt: Date | null;
  closedAt: Date | null;
}

async function ensureStoreStatusExists(): Promise<StoreStatus> {
    let status = await prisma.storeStatus.findUnique({
        where: { id: STORE_STATUS_RECORD_ID }
    });

    if (!status) {
        status = await prisma.storeStatus.create({
            data: {
                id: STORE_STATUS_RECORD_ID,
                isOpen: false,
                closedAt: new Date()
            }
        });
    }
    return status;
}


export async function getStoreStatus(): Promise<StoreStatusResult> {
    const status = await ensureStoreStatusExists();
    return {
        isOpen: status.isOpen,
        openedAt: status.openedAt,
        closedAt: status.closedAt,
    };
}

export async function toggleStoreStatus(shouldBeOpen: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureStoreStatusExists(); // Garante que o registro exista

    if (shouldBeOpen) {
      await prisma.storeStatus.update({
        where: { id: STORE_STATUS_RECORD_ID },
        data: {
            isOpen: true,
            openedAt: new Date(),
            closedAt: null,
        }
      });
    } else {
      await prisma.storeStatus.update({
        where: { id: STORE_STATUS_RECORD_ID },
        data: {
            isOpen: false,
            closedAt: new Date(),
        }
      });
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error toggling store status:", error);
    return { success: false, error: 'Failed to update store status.' };
  }
}
