'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Eye, Search, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Patient, PatientStatusType } from '@/lib/types';
import PatientDetailsModal from './patient-details-modal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface PatientsDataTableProps {
  data: Patient[];
  pageCount: number;
  totalCount: number;
  onSearch?: (query: string) => void;
  onStatusFilter?: (status: 'LEAD' | 'MEMBRO' | 'all') => void;
  onPageChange?: (page: number) => void;
  onDeletePatient?: (patientId: string) => void;
  associationId?: string;
}

export default function PatientsDataTable({ 
  data, 
  pageCount, 
  totalCount, 
  onSearch, 
  onStatusFilter, 
  onPageChange,
  onDeletePatient,
  associationId
}: PatientsDataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [deletingPatientId, setDeletingPatientId] = useState<string | null>(null);
  const { toast } = useToast();

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
    if (onSearch) {
      onSearch(value);
    } else {
      startTransition(() => {
        router.push(
          `${pathname}?${createQueryString({
            search: value || null,
            page: 1
          })}`
        );
      });
    }
  };

  const handleStatusFilter = (value: string) => {
    if (onStatusFilter) {
      onStatusFilter(value as 'LEAD' | 'MEMBRO' | 'all');
    } else {
      startTransition(() => {
        router.push(
          `${pathname}?${createQueryString({
            status: value === 'all' ? null : value,
            page: 1
          })}`
        );
      });
    }
  };

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDetailsModalOpen(true);
  };

  const handleDeletePatient = async (patient: Patient) => {
    setDeletingPatientId(patient.id);

    try {
      const response = await fetch(`/api/admin/patients?patientId=${patient.id}&associationId=${associationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const statusText = patient.status === 'LEAD' ? 'Lead' : 'Paciente';
        toast({
          title: "Sucesso",
          description: `${statusText} excluído com sucesso do CRM.`,
        });
        
        // Call callback to refresh data
        if (onDeletePatient) {
          onDeletePatient(patient.id);
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Erro",
          description: errorData.error || "Erro ao excluir paciente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao excluir paciente:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir paciente. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeletingPatientId(null);
    }
  };

  const getStatusBadge = (status: PatientStatusType) => {
    switch (status) {
      case 'MEMBRO':
        return <Badge variant="default" className="bg-green-100 text-green-800">Membro</Badge>;
      case 'LEAD':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Lead</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
  };

  const columns: ColumnDef<Patient>[] = [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => (
        <div className="font-medium max-w-[200px] truncate" title={row.getValue('name')}>
          {row.getValue('name')}
        </div>
      ),
    },
    {
      accessorKey: 'whatsapp',
      header: 'WhatsApp',
      cell: ({ row }) => (
        <div className="font-mono text-sm">{formatPhone(row.getValue('whatsapp'))}</div>
      ),
    },
    {
      accessorKey: 'cpf',
      header: 'CPF',
      cell: ({ row }) => (
        <div className="font-mono text-sm">{formatCPF(row.getValue('cpf'))}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.getValue('status')),
    },
    {
      accessorKey: 'tipo_associacao',
      header: 'Tipo Associação',
      cell: ({ row }) => {
        const tipo = row.getValue('tipo_associacao') as string;
        return (
          <div className="text-sm max-w-[120px] truncate" title={tipo || 'Não informado'}>
            {tipo || '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Criado em',
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'));
        return <div className="text-sm">{date.toLocaleDateString('pt-BR')}</div>;
      },
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row.original)}
            className="h-8 w-8 p-0"
            title="Ver detalhes completos do paciente"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {/* Botão de excluir para qualquer paciente */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                title={`Excluir ${row.original.status === 'LEAD' ? 'lead' : 'paciente'} do CRM`}
                disabled={deletingPatientId === row.original.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Excluir {row.original.status === 'LEAD' ? 'Lead' : 'Paciente'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir {row.original.status === 'LEAD' ? 'o lead' : 'o paciente'} <strong>{row.original.name}</strong> do CRM?
                  <br />
                  <span className="text-sm text-muted-foreground mt-2 block">
                    Esta ação remove o paciente apenas do CRM SatiZap. 
                    {row.original.status === 'MEMBRO' && row.original.wordpress_id && (
                      <span className="block mt-1 text-blue-600">
                        Os dados no WordPress permanecerão inalterados.
                      </span>
                    )}
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeletePatient(row.original)}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deletingPatientId === row.original.id}
                >
                  {deletingPatientId === row.original.id ? 'Excluindo...' : 'Excluir do CRM'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns: columns as ColumnDef<Patient, unknown>[],
    getCoreRowModel: getCoreRowModel(),
    pageCount,
    manualPagination: true,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nome, telefone, CPF ou email..."
            defaultValue={searchParams.get('search') || ''}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          defaultValue={searchParams.get('status') || 'all'}
          onValueChange={handleStatusFilter}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="MEMBRO">Membros</SelectItem>
            <SelectItem value="LEAD">Leads</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count and summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Mostrando {data.length} de {totalCount} pacientes
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Membros: {data.filter(p => p.status === 'MEMBRO').length}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            Leads: {data.filter(p => p.status === 'LEAD').length}
          </span>
        </div>
      </div>

      {/* Data Table */}
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
                  Nenhum paciente encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const currentPage = table.getState().pagination.pageIndex;
            if (onPageChange) {
              onPageChange(currentPage);
            } else {
              router.push(`${pathname}?${createQueryString({ page: currentPage })}`);
            }
          }}
          disabled={table.getState().pagination.pageIndex === 0}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const nextPage = table.getState().pagination.pageIndex + 2;
            if (onPageChange) {
              onPageChange(nextPage);
            } else {
              router.push(`${pathname}?${createQueryString({ page: nextPage })}`);
            }
          }}
          disabled={table.getState().pagination.pageIndex + 1 === pageCount}
        >
          Próximo
        </Button>
      </div>

      {/* Patient Details Modal */}
      <PatientDetailsModal
        patient={selectedPatient}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedPatient(null);
        }}
      />
    </div>
  );
}