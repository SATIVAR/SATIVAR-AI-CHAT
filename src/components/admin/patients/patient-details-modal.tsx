'use client';

import { Patient, PatientStatusType } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Phone, CreditCard, Users, Calendar, Globe, UserCheck, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface PatientDetailsModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PatientDetailsModal({ patient, isOpen, onClose }: PatientDetailsModalProps) {
  if (!patient) return null;

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
    if (!cpf) return 'Não informado';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasResponsavelData = patient.nome_responsavel || patient.cpf_responsavel;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalhes do Paciente - {patient.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header com Status Principal */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              {patient.status === 'MEMBRO' ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <Clock className="h-8 w-8 text-yellow-600" />
              )}
              <div>
                <h3 className="font-semibold text-lg">{patient.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {patient.status === 'MEMBRO' ? 'Membro Sincronizado' : 'Lead em Conversão'}
                </p>
              </div>
            </div>
            {getStatusBadge(patient.status)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna Esquerda - Dados do Paciente */}
            <div className="space-y-6">
              {/* Informações Básicas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Dados do Paciente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                      <p className="text-sm font-medium mt-1">{patient.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        WhatsApp
                      </label>
                      <p className="text-sm font-mono mt-1">{formatPhone(patient.whatsapp)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        CPF
                      </label>
                      <p className="text-sm font-mono mt-1">{formatCPF(patient.cpf)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-sm mt-1">{patient.email || 'Não informado'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dados do Responsável (se existir) */}
              {hasResponsavelData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Dados do Responsável
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Nome do Responsável</label>
                        <p className="text-sm mt-1">{patient.nome_responsavel || 'Não informado'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          CPF do Responsável
                        </label>
                        <p className="text-sm font-mono mt-1">{formatCPF(patient.cpf_responsavel)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Coluna Direita - Dados da Associação e Sistema */}
            <div className="space-y-6">
              {/* Dados da Associação */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Dados da Associação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tipo de Associação</label>
                      <p className="text-sm mt-1">{patient.tipo_associacao || 'Não informado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        WordPress ID
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-mono">{patient.wordpress_id || 'Não sincronizado'}</p>
                        {patient.wordpress_id ? (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            Sincronizado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                            Local
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Informações do Sistema */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Informações do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Criado em</label>
                      <p className="text-sm mt-1">{formatDate(patient.createdAt)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Última atualização</label>
                      <p className="text-sm mt-1">{formatDate(patient.updatedAt)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status no Sistema</label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm">{patient.isActive ? 'Ativo' : 'Inativo'}</p>
                        {patient.isActive ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Informações Contextuais baseadas no Status */}
          <Card className={patient.status === 'LEAD' ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}>
            <CardContent className="pt-6">
              {patient.status === 'LEAD' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <h4 className="font-medium text-yellow-800">Status: Lead em Conversão</h4>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-yellow-700">
                      <strong>Situação:</strong> Este paciente ainda não foi encontrado no sistema WordPress durante o processo de onboarding.
                    </p>
                    <p className="text-sm text-yellow-700">
                      <strong>Dados disponíveis:</strong> Informações básicas coletadas (nome, WhatsApp, CPF) durante a primeira interação.
                    </p>
                    <p className="text-sm text-yellow-700">
                      <strong>Próximos passos:</strong> A IA está trabalhando para coletar informações adicionais e converter este lead em um membro pleno.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium text-green-800">Status: Membro Sincronizado</h4>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-green-700">
                      <strong>Situação:</strong> Paciente encontrado e sincronizado com sucesso do sistema WordPress.
                    </p>
                    <p className="text-sm text-green-700">
                      <strong>Dados disponíveis:</strong> Perfil completo importado dos campos ACF (Advanced Custom Fields) do WordPress.
                    </p>
                    <p className="text-sm text-green-700">
                      <strong>Funcionalidades:</strong> A IA pode usar todos os dados contextuais para personalizar o atendimento e verificar identidade.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumo de Completude dos Dados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Completude dos Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${patient.name ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    <User className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-medium">Nome</p>
                  <p className="text-xs text-muted-foreground">{patient.name ? 'Completo' : 'Pendente'}</p>
                </div>
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${patient.cpf ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-medium">CPF</p>
                  <p className="text-xs text-muted-foreground">{patient.cpf ? 'Completo' : 'Pendente'}</p>
                </div>
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${patient.tipo_associacao ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Users className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-medium">Tipo Associação</p>
                  <p className="text-xs text-muted-foreground">{patient.tipo_associacao ? 'Completo' : 'Pendente'}</p>
                </div>
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${patient.wordpress_id ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    <Globe className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-medium">WordPress</p>
                  <p className="text-xs text-muted-foreground">{patient.wordpress_id ? 'Sincronizado' : 'Local'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}