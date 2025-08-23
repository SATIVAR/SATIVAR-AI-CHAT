'use server';

import { storage } from './admin';

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

// Pro-tip: Set CORS on your bucket to allow uploads from your app's domain.
// This is necessary to fix "unexpected response from server" errors during direct browser uploads.
// 1. Create a file named cors.json with the content below.
// 2. Replace the origins with your actual app domains (dev and prod).
// 3. Run the gcloud command to apply the settings to your bucket.
//
// cors.json content:
// [
//   {
//     "origin": ["http://localhost:9002", "https://your-production-app-url.com"],
//     "method": ["PUT"],
//     "responseHeader": ["Content-Type", "Content-Length"],
//     "maxAgeSeconds": 3600
//   }
// ]
//
// Command to run:
// gcloud storage buckets update gs://<your-bucket-name> --cors-file=cors.json


export async function getSignedUrl(fileType: string, size: number, folder: string) {
    if (!BUCKET_NAME) {
        throw new Error('Firebase Storage bucket name is not configured.');
    }
    if (size > 10 * 1024 * 1024) { // 10 MB limit
        return { error: 'File size exceeds 10MB limit.' };
    }

    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const file = storage.bucket(BUCKET_NAME).file(fileName);

    try {
        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType: fileType,
        });
        return { url, fileName };
    } catch (error: any) {
        console.error("Error getting signed URL: ", error);
        return { error: 'Could not get signed URL.' };
    }
}

export async function deleteFile(filePath: string) {
    if (!BUCKET_NAME) {
        throw new Error('Firebase Storage bucket name is not configured.');
    }
    try {
        await storage.bucket(BUCKET_NAME).file(filePath).delete();
        return { success: true };
    } catch (error: any) {
        // If the file doesn't exist, it's not an error we need to throw
        if (error.code === 404) {
            console.log(`File not found, skipping deletion: ${filePath}`);
            return { success: true };
        }
        console.error("Error deleting file: ", error);
        return { error: 'Could not delete file.' };
    }
}
