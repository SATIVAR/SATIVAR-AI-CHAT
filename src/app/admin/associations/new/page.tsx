import { AssociationForm } from '@/components/admin/associations/association-form';

export default function NewAssociationPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Nova Associação</h1>
        <p className="text-muted-foreground">
          Crie uma nova associação para gerenciar produtos e interações com IA.
        </p>
      </div>
      
      <AssociationForm />
    </div>
  );
}