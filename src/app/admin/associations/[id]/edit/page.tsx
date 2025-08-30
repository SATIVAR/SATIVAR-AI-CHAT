import { EditAssociationClient } from '@/components/admin/associations/edit-association-client';
import { notFound } from 'next/navigation';

interface EditAssociationPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getAssociation(id: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/admin/associations/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.association;
  } catch (error) {
    console.error('Error fetching association:', error);
    return null;
  }
}

export default async function EditAssociationPage({ params }: EditAssociationPageProps) {
  const { id } = await params;
  const association = await getAssociation(id);

  if (!association) {
    notFound();
  }

  return (
    <div className="h-full">
      <EditAssociationClient association={association} />
    </div>
  );
}