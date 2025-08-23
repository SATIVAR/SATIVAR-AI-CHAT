
import { getClients, updateClient, createClient } from '@/lib/firebase/clients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Client } from '@/lib/types';
import ClientsDataTable from '@/components/admin/clients/clients-data-table';
import { revalidatePath } from 'next/cache';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {

  const page = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1;
  const limit = typeof searchParams.limit === 'string' ? Number(searchParams.limit) : 10;
  const searchQuery = typeof searchParams.search === 'string' ? searchParams.search : '';
  
  const data = await getClients({ searchQuery, page, limit });

  const handleSaveClient = async (clientData: Partial<Client>) => {
    'use server';
    let result;
    if (clientData.id) {
        const { id, ...dataToUpdate } = clientData;
        result = await updateClient(id, dataToUpdate);
    } else {
        result = await createClient(clientData);
    }
    revalidatePath('/admin/clients');
    return result;
  };

  const handleDeleteClient = async (id: string) => {
    'use server';
    const result = await updateClient(id, { isActive: false }); // Soft delete
    revalidatePath('/admin/clients');
    return result;
  };


  return (
    <div className="w-full space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientsDataTable 
            data={data.clients as unknown as Client[]}
            pageCount={data.totalPages}
            onSave={handleSaveClient}
            onDelete={handleDeleteClient}
          />
        </CardContent>
      </Card>
    </div>
  );
}
