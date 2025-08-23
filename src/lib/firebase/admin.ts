
// src/lib/firebase/admin.ts

import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// Este é o objeto que constrói as credenciais a partir do seu .env.local
const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
  // Esta linha é crucial para formatar a chave privada corretamente
  privateKey: (process.env.FIREBASE_PRIVATE_KEY as string)?.replace(/\\n/g, '\n'),
};

// Função para garantir que a inicialização ocorra apenas uma vez
function initializeAdminApp() {
  // A verificação getApps() previne erros de "já inicializado" no ambiente de desenvolvimento
  if (getApps().length > 0) {
    return admin.app();
  }

  // Verifica se todas as variáveis de ambiente necessárias estão presentes
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('As credenciais do Firebase Admin não foram encontradas nas variáveis de ambiente. Verifique seu arquivo .env');
  }

  try {
    const app = admin.initializeApp({
      // Passa explicitamente as credenciais para o SDK
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin inicializado com sucesso!');
    return app;

  } catch (error: any) {
    console.error('ERRO DETALHADO NA INICIALIZAÇÃO:', error);
    throw new Error('Falha ao inicializar o Firebase Admin. Verifique os logs do terminal.');
  }
}

// Inicializa e exporta os serviços
export const adminApp = initializeAdminApp();
export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
