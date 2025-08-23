
'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
} from '@tanstack/react-table';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Client } from '@/lib/types';
import ClientForm from './client-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';


interface DataTableProps<TData extends Client, TValue> {
    data: TData[];
    pageCount: number;
    onSave: (client: Partial<Client>) => Promise<{ success: boolean, error?: string }>;
    onDelete: (id: string) => Promise<{ success: boolean, error?: string }>;
}

export function ClientsDataTable<TData extends Client, TValue>({
    data,
    pageCount,
    onSave,
    onDelete
}: DataTableProps<TData, TValue>) {
    
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const columns: ColumnDef<TData, TValue>[] = [
        {
            accessorKey: 'name',
            header: 'Nome',
        },
        {
            accessorKey: 'phone',
            header: 'Telefone',
        },
        {
            accessorKey: 'address.city',
            header: 'Cidade',
            cell: ({ row }) => row.original.address?.city || 'N/A'
        },
        {
            accessorKey: 'createdAt',
            header: 'Cliente Desde',
            cell: ({ row }) => new Date(row.original.createdAt as any).toLocaleDateString('pt-BR'),
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const client = row.original;
                return (
                     <AlertDialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => { setSelectedClient(client); setIsFormOpen(true); }}>
                                    Editar
                                </DropdownMenuItem>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-red-500 hover:text-red-600 focus:text-red-600">
                                        Excluir
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                        </DropdownMenu>
                         <AlertDialogContent>
                             <AlertDialogHeader>
                                 <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                 <AlertDialogDescription>
                                     Esta ação marcará o cliente como inativo, mas manterá o histórico de pedidos.
                                 </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                 <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                 <AlertDialogAction onClick={async () => {
                                      const result = await onDelete(client.id!);
                                      if (result.success) {
                                        toast({ title: 'Sucesso!', description: 'Cliente excluído.' });
                                      } else {
                                        toast({ variant: 'destructive', title: 'Erro!', description: result.error });
                                      }
                                 }}>
                                    Confirmar Exclusão
                                </AlertDialogAction>
                             </AlertDialogFooter>
                         </AlertDialogContent>
                    </AlertDialog>
                );
            },
        },
    ];


    const table = useReactTable({
        data,
        columns: columns as ColumnDef<TData, unknown>[],
        getCoreRowModel: getCoreRowModel(),
        pageCount,
        manualPagination: true,
    });

    const createQueryString = React.useCallback(
        (params: Record<string, string | number | null>) => {
          const newSearchParams = new URLSearchParams(searchParams?.toString());
    
          for (const [key, value] of Object.entries(params)) {
            if (value === null) {
              newSearchParams.delete(key);
            } else {
              newSearchParams.set(key, String(value));
            }
          }
    
          return newSearchParams.toString();
        },
        [searchParams]
    );

    const handleSearch = (value: string) => {
        startTransition(() => {
            router.push(
                `${pathname}?${createQueryString({
                    search: value || null,
                    page: 1
                })}`
            )
        });
    }

    return (
        <div>
            <div className="flex items-center justify-between py-4">
                <Input
                    placeholder="Filtrar por nome ou telefone..."
                    defaultValue={searchParams.get("search") ?? ""}
                    onChange={(event) => handleSearch(event.currentTarget.value)}
                    className="max-w-sm"
                />
                <Button onClick={() => { setSelectedClient(null); setIsFormOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Cliente
                </Button>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    Nenhum resultado encontrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                 <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`${pathname}?${createQueryString({ page: table.getState().pagination.pageIndex - 1 + 1 })}`)}
                    disabled={table.getState().pagination.pageIndex === 0}
                >
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`${pathname}?${createQueryString({ page: table.getState().pagination.pageIndex + 1 + 1 })}`)}
                    disabled={table.getState().pagination.pageIndex + 1 === pageCount}
                >
                    Próximo
                </Button>
            </div>
            <ClientForm 
                isOpen={isFormOpen} 
                setIsOpen={setIsFormOpen}
                client={selectedClient}
                onSave={onSave}
            />
        </div>
    );
}

export default ClientsDataTable;
