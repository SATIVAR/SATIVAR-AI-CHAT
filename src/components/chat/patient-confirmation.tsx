'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageCircle, User, Phone, FileText, UserCheck, Users, Info } from 'lucide-react';

interface PatientData {
  id: string;
  name: string;
  whatsapp: string;
  status?: string;
  cpf?: string;
  tipo_associacao?: string;
  nome_responsavel?: string;
  cpf_responsavel?: string;
  source?: string;
}

interface PatientConfirmationProps {
  patientData: PatientData;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function PatientConfirmation({ patientData, onConfirm, isLoading = false }: PatientConfirmationProps) {
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: 'spring',
        stiffness: 100,
        damping: 15,
        staggerChildren: 0.1,
        delayChildren: 0.2,
      } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  // Format phone for display
  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    } else if (phone.length === 10) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  // Format CPF for display
  const formatCPF = (cpf?: string) => {
    if (!cpf || cpf.length !== 11) return cpf;
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  };

  // Get patient type display
  const getPatientTypeDisplay = () => {
    if (patientData.nome_responsavel) {
      return 'Menor de idade';
    }
    return patientData.tipo_associacao || 'Paciente';
  };

  // Determine who is the interlocutor (person using the chat)
  const getInterlocutorInfo = () => {
    const isResponsibleScenario = patientData.tipo_associacao === 'assoc_respon' && patientData.nome_responsavel;
    
    return {
      isResponsibleScenario,
      interlocutorName: isResponsibleScenario ? patientData.nome_responsavel : patientData.name,
      patientName: patientData.name,
      scenario: isResponsibleScenario ? 'responsible' : 'patient'
    };
  };

  const interlocutorInfo = getInterlocutorInfo();

  return (
    <motion.div 
      className="w-full space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Message - Contextual based on interlocutor */}
      <motion.div variants={itemVariants} className="text-center">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          interlocutorInfo.isResponsibleScenario 
            ? 'bg-blue-100 dark:bg-blue-900/30' 
            : 'bg-green-100 dark:bg-green-900/30'
        }`}>
          {interlocutorInfo.isResponsibleScenario ? (
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          ) : (
            <UserCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
          )}
        </div>
        
        {interlocutorInfo.isResponsibleScenario ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Olá, {interlocutorInfo.interlocutorName}!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Você está iniciando o atendimento para <strong>{interlocutorInfo.patientName}</strong>
            </p>
            <Badge variant="secondary" className="mt-2">
              <Users className="w-3 h-3 mr-1" />
              Atendimento via Responsável
            </Badge>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Bem-vindo(a) de volta, {interlocutorInfo.interlocutorName}!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Encontramos seus dados em nosso sistema
            </p>
            <Badge variant="default" className="mt-2">
              <User className="w-3 h-3 mr-1" />
              Atendimento Direto
            </Badge>
          </>
        )}
      </motion.div>

      {/* Contextual Information Alert */}
      {interlocutorInfo.isResponsibleScenario && (
        <motion.div variants={itemVariants}>
          <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Durante a conversa, as perguntas serão direcionadas a você como responsável, 
              mas os dados de entrega e informações médicas se referem ao paciente <strong>{interlocutorInfo.patientName}</strong>.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Patient Information Card */}
      <motion.div variants={itemVariants}>
        <Card className={`${
          interlocutorInfo.isResponsibleScenario 
            ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800'
            : 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800'
        }`}>
          <CardContent className="p-6 space-y-4">
            {/* Patient Name */}
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                interlocutorInfo.isResponsibleScenario 
                  ? 'bg-indigo-100 dark:bg-indigo-900/30' 
                  : 'bg-green-100 dark:bg-green-900/30'
              }`}>
                <User className={`w-5 h-5 ${
                  interlocutorInfo.isResponsibleScenario 
                    ? 'text-indigo-600 dark:text-indigo-400' 
                    : 'text-green-600 dark:text-green-400'
                }`} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {interlocutorInfo.isResponsibleScenario ? 'Paciente (Atendimento)' : 'Paciente'}
                </p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {patientData.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {getPatientTypeDisplay()}
                </p>
              </div>
            </div>

            {/* Responsible Person (if exists) */}
            {patientData.nome_responsavel && (
              <div className={`flex items-center space-x-3 pl-4 border-l-2 ${
                interlocutorInfo.isResponsibleScenario 
                  ? 'border-blue-200 dark:border-blue-800' 
                  : 'border-green-200 dark:border-green-800'
              }`}>
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {interlocutorInfo.isResponsibleScenario ? 'Responsável (Você)' : 'Responsável'}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {patientData.nome_responsavel}
                  </p>
                  {patientData.cpf_responsavel && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      CPF: {formatCPF(patientData.cpf_responsavel)}
                    </p>
                  )}
                  {interlocutorInfo.isResponsibleScenario && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Interlocutor Ativo
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">WhatsApp</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatPhone(patientData.whatsapp)}
                </p>
              </div>
            </div>

            {/* CPF (if available) */}
            {patientData.cpf && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">CPF</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCPF(patientData.cpf)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Confirmation Button */}
      <motion.div variants={itemVariants}>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className={`w-full h-14 text-lg shadow-lg ${
            interlocutorInfo.isResponsibleScenario
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25 dark:shadow-blue-500/10'
              : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-green-500/25 dark:shadow-green-500/10'
          }`}
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Iniciando...
            </>
          ) : (
            <>
              <MessageCircle className="mr-2 h-5 w-5" />
              {interlocutorInfo.isResponsibleScenario 
                ? `Iniciar Atendimento para ${interlocutorInfo.patientName}`
                : 'Iniciar Atendimento'
              }
            </>
          )}
        </Button>
      </motion.div>


    </motion.div>
  );
}