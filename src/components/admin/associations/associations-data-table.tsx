'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, ExternalLink } from 'lucide-react';
import { Association } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface DataTableProps<TData extends Association> {
    data: TData[];
}

export function AssociationsDataTable<TData extends Association>({
    data
}: DataTableProps<TData>) {
    
    const { toast } = useToast();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentData, setCurrentData] = useState<TData[]>(data);

    // Sync currentData with data prop changes
    useEffect(() => {
        setCurrentData(data);
    }, [data]);

    // API handling functions

    const handleDeleteAssociation = async (id: string): Promise<{ success: boolean, error?: string }> => {
        try {
            const response = await fetch(`/api/admin/associations/${id}`, {
                method: 'DELETE',
            });

            const result = await response.json();
            
            if (result.success) {
                // Remove from local state immediately
                setCurrentData(prev => prev.filter(item => item.id !== id));
                // Refresh the page after a short delay to ensure consistency
                setTimeout(() => router.refresh(), 100);
                return { success: true };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Error deleting association:', error);
            return { success: false, error: 'Erro interno do servidor' };
        }
    };

    const filteredData = useMemo(() => 
        currentData.filter(association => 
            association.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            association.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
        ), [currentData, searchQuery]
    );

    const columns: ColumnDef<TData>[] = useMemo(() => [
        {
            accessorKey: 'name',
            header: 'Nome',
        },
        {
            accessorKey: 'subdomain',
            header: 'Subdomínio',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                        {row.original.subdomain}
                    </code>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(`https://${row.original.subdomain}.satizap.com`, '_blank')}
                    >
                        <ExternalLink className="h-3 w-3" />
                    </Button>
                </div>
            )
        },
        {
            accessorKey: 'wordpressUrl',
            header: 'WordPress URL',
            cell: ({ row }) => (
                <div className="max-w-xs truncate" title={row.original.wordpressUrl}>
                    {row.original.wordpressUrl}
                </div>
            )
        },
        {
            accessorKey: 'isActive',
            header: 'Status',
            cell: ({ row }) => (
                <Badge variant={row.original.isActive ? "default" : "secondary"}>
                    {row.original.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
            )
        },
        {
            accessorKey: 'createdAt',
            header: 'Criado em',
            cell: ({ row }) => new Date(row.original.createdAt as any).toLocaleDateString('pt-BR'),
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const association = row.original;
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
                                <DropdownMenuItem onClick={() => router.push(`/admin/associations/${association.id}/edit`)}>
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
                                     Esta ação excluirá permanentemente a associação e todos os dados relacionados. Esta ação não pode ser desfeita.
                                 </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                 <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                 <AlertDialogAction onClick={async () => {
                                      const result = await handleDeleteAssociation(association.id!);
                                      if (result.success) {
                                        toast({ title: 'Sucesso!', description: 'Associação excluída.' });
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
    ], [toast, handleDeleteAssociation, router]);

    const table = useReactTable({
        data: filteredData,
        columns: columns as ColumnDef<TData, unknown>[],
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div>
            <div className="flex items-center justify-between py-4">
                <Input
                    placeholder="Filtrar por nome ou subdomínio..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="max-w-sm"
                />
                <Button onClick={() => router.push('/admin/associations/new')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Associação
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
        </div>
    );
}

export default AssociationsDataTable;