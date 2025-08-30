
import { getClients } from '@/lib/services/client.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Client } from '@/lib/types';
import ClientsDataTable from '@/components/admin/clients/clients-data-table';
import { Client as PrismaClient, Address as PrismaAddress } from '@prisma/client';

// Tipagem para os dados que vêm do serviço Prisma
type ClientWithAddress = PrismaClient & { address: PrismaAddress | null };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {

  const params = await searchParams;
  const page = typeof params.page === 'string' ? Number(params.page) : 1;
  const limit = typeof params.limit === 'string' ? Number(params.limit) : 10;
  const searchQuery = typeof params.search === 'string' ? params.search : '';
  
  const data = await getClients({ searchQuery, page, limit });

  // Serializa os dados do Prisma para o tipo esperado pelo componente cliente
  const serializableClients: Client[] = data.clients.map((client: any) => {
    const createdAt = client.createdAt instanceof Date ? client.createdAt.toISOString() : 
                     (typeof client.createdAt === 'string' ? client.createdAt : new Date().toISOString());
    const lastOrderAt = client.lastOrderAt instanceof Date ? client.lastOrderAt.toISOString() : 
                       (typeof client.lastOrderAt === 'string' ? client.lastOrderAt : new Date().toISOString());
    
    return {
      ...client,
      createdAt,
      lastOrderAt,
      address: client.address ? { ...client.address } : undefined,
    };
  });


  return (
    <div className="w-full space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Pacientes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualização dos pacientes sincronizados do WordPress via chat
          </p>
        </CardHeader>
        <CardContent>
          <ClientsDataTable 
            data={serializableClients}
            pageCount={data.totalPages}
          />
        </CardContent>
      </Card>
    </div>
  );
}
