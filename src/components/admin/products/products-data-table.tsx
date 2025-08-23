
'use client';

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, ImageIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Product, ProductCategory } from '@/lib/types';
import ProductForm from './product-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DataTableProps<TData extends Product, TValue> {
    data: TData[];
    pageCount: number;
    categories: ProductCategory[];
    onSave: (data: FormData) => Promise<{ success: boolean, error?: string }>;
    onDelete: (id: string) => Promise<{ success: boolean, error?: string }>;
}

export function ProductsDataTable<TData extends Product, TValue>({
    data,
    pageCount,
    categories,
    onSave,
    onDelete
}: DataTableProps<TData, TValue>) {
    
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Partial<TData> | null>(null);

    const categoryMap = React.useMemo(() => {
        const map = new Map<string, string>();
        categories.forEach(cat => map.set(cat.id, cat.name));
        return map;
    }, [categories]);

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
            accessorKey: 'price',
            header: 'Preço',
            cell: ({ row }) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.original.price)
        },
        {
            accessorKey: 'categoryId',
            header: 'Categoria',
            cell: ({ row }) => categoryMap.get(row.original.categoryId) || 'Sem Categoria'
        },
        {
            accessorKey: 'isActive',
            header: 'Ativo',
            cell: ({ row }) => row.original.isActive ? 'Sim' : 'Não'
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const product = row.original;
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
                                <DropdownMenuItem onClick={() => { setSelectedProduct(product); setIsFormOpen(true); }}>
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
                                     Esta ação marcará o produto como inativo, mas o manterá no histórico de pedidos.
                                 </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                 <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                 <AlertDialogAction onClick={async () => {
                                      const result = await onDelete(product.id!);
                                      if (result.success) {
                                        toast({ title: 'Sucesso!', description: 'Produto excluído.' });
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
        pageCount,
        manualPagination: true,
    });

    const createQueryString = React.useCallback(
        (params: Record<string, string | number | null>) => {
          const newSearchParams = new URLSearchParams(searchParams?.toString());
          for (const [key, value] of Object.entries(params)) {
            if (value === null || value === 'all') {
              newSearchParams.delete(key);
            } else {
              newSearchParams.set(key, String(value));
            }
          }
          return newSearchParams.toString();
        },
        [searchParams]
    );

    const handleCategoryFilter = (categoryId: string) => {
        startTransition(() => {
            router.push(
                `${pathname}?${createQueryString({
                    category: categoryId,
                    page: 1
                })}`
            );
        });
    };

    return (
        <div>
            <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                    <Select onValueChange={handleCategoryFilter} defaultValue={searchParams.get('category') ?? 'all'}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Categorias</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => { setSelectedProduct(null); setIsFormOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Produto
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
                                    Nenhum produto encontrado.
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
                    onClick={() => router.push(`${pathname}?${createQueryString({ page: table.getState().pagination.pageIndex, ...searchParams })}`)}
                    disabled={table.getState().pagination.pageIndex === 0}
                >
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`${pathname}?${createQueryString({ page: table.getState().pagination.pageIndex + 2, ...searchParams })}`)}
                    disabled={table.getState().pagination.pageIndex + 1 >= pageCount}
                >
                    Próximo
                </Button>
            </div>
            <ProductForm 
                isOpen={isFormOpen} 
                setIsOpen={setIsFormOpen}
                product={selectedProduct}
                categories={categories}
                onSave={onSave}
            />
        </div>
    );
}

export default ProductsDataTable;
