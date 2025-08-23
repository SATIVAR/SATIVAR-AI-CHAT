
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
} from '@tanstack/react-table';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, ImageIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ProductCategory } from '@/lib/types';
import CategoryForm from './category-form';

interface DataTableProps<TData extends ProductCategory, TValue> {
    data: TData[];
    allCategories: TData[];
    onSave: (data: FormData) => Promise<{ success: boolean, error?: string }>;
    onDelete: (id: string, imageUrl?: string) => Promise<{ success: boolean, error?: string }>;
}

export function CategoriesDataTable<TData extends ProductCategory, TValue>({
    data,
    allCategories,
    onSave,
    onDelete
}: DataTableProps<TData, TValue>) {
    
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Partial<TData> | null>(null);

    const columns: ColumnDef<TData>[] = [
        {
            accessorKey: 'imageUrl',
            header: 'Imagem',
            cell: ({ row }) => {
                const imageUrl = row.original.imageUrl;
                return (
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden border">
                        {imageUrl ? (
                            <Image src={imageUrl} alt={row.original.name} width={48} height={48} className="object-cover w-full h-full" />
                        ) : (
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        )}
                    </div>
                )
            }
        },
        {
            accessorKey: 'name',
            header: 'Nome',
        },
        {
            accessorKey: 'order',
            header: 'Ordem',
        },
        {
            accessorKey: 'description',
            header: 'Descrição',
            cell: ({ row }) => <p className="truncate max-w-xs">{row.original.description}</p>
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const category = row.original;
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
                                <DropdownMenuItem onClick={() => { setSelectedCategory(category); setIsFormOpen(true); }}>
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
                                     Esta ação excluirá a categoria e sua imagem permanentemente. Esta ação não pode ser desfeita.
                                 </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                 <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                 <AlertDialogAction onClick={async () => {
                                      const result = await onDelete(category.id!, category.imageUrl);
                                      if (result.success) {
                                        toast({ title: 'Sucesso!', description: 'Categoria excluída.' });
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
        columns,
        getCoreRowModel: getCoreRowModel(),
    });


    return (
        <div>
            <div className="flex items-center justify-end py-4">
                <Button onClick={() => { setSelectedCategory(null); setIsFormOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Categoria
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
                                    Nenhuma categoria encontrada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <CategoryForm 
                isOpen={isFormOpen} 
                setIsOpen={setIsFormOpen}
                category={selectedCategory}
                allCategories={allCategories}
                onSave={onSave}
            />
        </div>
    );
}

export default CategoriesDataTable;
