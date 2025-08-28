
import { doesOwnerExist } from '@/lib/firebase/auth-admin';
import RegisterOwnerForm from '@/components/admin/register-owner-form';
import LoginOwnerForm from '@/components/admin/login-owner-form';

export const revalidate = 0;

export default async function AdminAccessPage() {
  const ownerExists = await doesOwnerExist();

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      {ownerExists ? <LoginOwnerForm /> : <RegisterOwnerForm />}
    </main>
  );
}
