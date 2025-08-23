
import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// Ensure environment variables are loaded
import 'dotenv/config'

function initializeAdminApp() {
  if (getApps().length > 0) {
    return admin.app();
  }

  const serviceAccount: admin.ServiceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('Firebase Admin SDK credentials are not set in .env');
    throw new Error('Firebase Admin SDK credentials are not set.');
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://s${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
    throw new Error('Firebase admin initialization failed.');
  }
}


function getDb() {
  initializeAdminApp();
  return admin.firestore();
}

function getAuth() {
  initializeAdminApp();
  return admin.auth();
}

function getStorage() {
  initializeAdminApp();
  return admin.storage();
}

export const db = getDb();
export const auth = getAuth();
export const storage = getStorage();
