import { AssociationForm } from '@/components/admin/associations/association-form';
import { notFound } from 'next/navigation';

interface EditAssociationPageProps {
  params: {
    id: string;
  };
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
  const association = await getAssociation(params.id);

  if (!association) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Editar Associação</h1>
        <p className="text-muted-foreground">
          Edite as informações e configurações da associação.
        </p>
      </div>
      
      <AssociationForm initialData={association} />
    </div>
  );
}