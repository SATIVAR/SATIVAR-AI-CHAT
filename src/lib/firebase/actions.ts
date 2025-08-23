
'use server';

import { storage } from './admin';

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;


export async function uploadFile(formData: FormData) {
    if (!BUCKET_NAME) {
        throw new Error('Firebase Storage bucket name is not configured.');
    }
    
    const file = formData.get('imageFile') as File | null;

    if (!file) {
        return { error: 'Nenhum arquivo de imagem fornecido.' };
    }
     if (file.size > 10 * 1024 * 1024) { // 10 MB limit
        return { error: 'O arquivo excede o limite de 10MB.' };
    }


    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `categories/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const storageFile = storage.bucket(BUCKET_NAME).file(fileName);

    try {
        await storageFile.save(fileBuffer, {
            metadata: { contentType: file.type }
        });
        
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;

        return { url: publicUrl };
    } catch (error: any) {
        console.error("Error uploading file: ", error);
        return { error: 'Não foi possível fazer o upload do arquivo.' };
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
