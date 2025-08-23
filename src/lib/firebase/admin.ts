
import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// Ensure environment variables are loaded
import 'dotenv/config'

/**
 * Initializes the Firebase Admin SDK, reusing the existing app if it exists.
 * This function relies on the GOOGLE_APPLICATION_CREDENTIALS environment variable
 * being set to the content of your Firebase service account JSON file.
 */
function initializeAdminApp() {
  // If an app is already initialized, return it to prevent re-initialization
  if (getApps().length > 0) {
    return admin.app();
  }

  // Check if the essential environment variable is set.
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const errorMessage = 'GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. Please provide the service account credentials.';
    console.error('Firebase Admin SDK Error:', errorMessage);
    throw new Error(errorMessage);
  }

  try {
    // initializeApp will automatically use the credentials from the environment variable.
    return admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.stack);
    throw new Error('Firebase admin initialization failed.');
  }
}

// Lazy-initialized instances of Firebase services
let dbInstance: admin.firestore.Firestore;
let authInstance: admin.auth.Auth;
let storageInstance: admin.storage.Storage;

export const db = () => {
  if (!dbInstance) {
    initializeAdminApp();
    dbInstance = admin.firestore();
  }
  return dbInstance;
};

export const auth = () => {
  if (!authInstance) {
    initializeAdminApp();
    authInstance = admin.auth();
  }
  return authInstance;
};

export const storage = () => {
  if (!storageInstance) {
    initializeAdminApp();
    storageInstance = admin.storage();
  }
  return storageInstance;
};
