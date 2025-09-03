'use client';

import React, { useState, useEffect } from 'react';
import { Association, Patient } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Loader2 } from 'lucide-react';
import PatientsDataTable from './patients-data-table';

interface PatientsAdminClientWrapperProps {
  associations: Association[];
}

export default function PatientsAdminClientWrapper({ associations }: PatientsAdminClientWrapperProps) {
  const [selectedAssociationId, setSelectedAssociationId] = useState<string>('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSession, setUserSession] = useState<any>(null);

  // Load user session to check role
  useEffect(() => {
    try {
      const authCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-session='));
      
      if (authCookie) {
        const sessionData = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
        setUserSession(sessionData);
        
        // If user is a manager, auto-select their association
        if (sessionData.role === 'manager' && sessionData.associationId) {
          setSelectedAssociationId(sessionData.associationId);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar sessão:', error);
    }
  }, []);

  // Load patients when association is selected
  useEffect(() => {
    if (selectedAssociationId) {
      loadPatients(selectedAssociationId);
    } else {
      setPatients([]);
      setTotalCount(0);
      setTotalPages(0);
    }
  }, [selectedAssociationId]);

  const loadPatients = async (associationId: string, page = 1, limit = 10, searchQuery = '', status?: 'LEAD' | 'MEMBRO') => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        associationId,
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (status) params.append('status', status);
      
      const response = await fetch(`/api/admin/patients?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar pacientes');
      }
      
      const data = await response.json();
      setPatients(data.patients);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      setError('Erro ao carregar pacientes. Tente novamente.');
      setPatients([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  const selectedAssociation = associations.find(a => a.id === selectedAssociationId);
  
  // Filter associations based on user role
  const availableAssociations = userSession?.role === 'manager' 
    ? associations.filter(a => a.id === userSession.associationId)
    : associations;

  return (
    <div className="space-y-6">
      {/* Association Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Seleção de Associação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <Select
                value={selectedAssociationId}
                onValueChange={setSelectedAssociationId}
                disabled={userSession?.role === 'manager'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma associação para visualizar os pacientes" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssociations.map((association) => (
                    <SelectItem key={association.id} value={association.id}>
                      <div className="flex items-center gap-2">
                        <span>{association.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {association.subdomain}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedAssociation && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {loading ? 'Carregando...' : `${totalCount} pacientes`}
                </span>
              </div>
            )}
          </div>
          
          {userSession?.role === 'manager' && (
            <p className="text-xs text-muted-foreground mt-2">
              Como gerente, você pode visualizar apenas os pacientes da sua associação.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Patients Data */}
      {selectedAssociationId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pacientes - {selectedAssociation?.name}</span>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => loadPatients(selectedAssociationId)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : patients.length > 0 ? (
              <PatientsDataTable 
                data={patients}
                pageCount={totalPages}
                totalCount={totalCount}
                onSearch={(query) => loadPatients(selectedAssociationId, 1, 10, query)}
                onStatusFilter={(status) => loadPatients(selectedAssociationId, 1, 10, '', status)}
                onPageChange={(page) => loadPatients(selectedAssociationId, page)}
                onDeletePatient={(patientId) => {
                  // Remove patient from local state and reload data
                  setPatients(prev => prev.filter(p => p.id !== patientId));
                  setTotalCount(prev => prev - 1);
                  // Reload to get accurate counts
                  loadPatients(selectedAssociationId);
                }}
                associationId={selectedAssociationId}
              />
            ) : !loading && selectedAssociationId ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum paciente encontrado para esta associação.</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {!selectedAssociationId && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Selecione uma Associação</h3>
            <p className="text-muted-foreground">
              Escolha uma associação acima para visualizar e gerenciar seus pacientes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}