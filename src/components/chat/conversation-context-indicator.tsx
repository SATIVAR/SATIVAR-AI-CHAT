'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { User, Users, MessageCircle, UserCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationContextIndicatorProps {
  patientName: string;
  interlocutorName: string;
  isResponsibleScenario: boolean;
  patientStatus?: 'LEAD' | 'MEMBRO';
  className?: string;
}

export function ConversationContextIndicator({
  patientName,
  interlocutorName,
  isResponsibleScenario,
  patientStatus = 'MEMBRO',
  className
}: ConversationContextIndicatorProps) {
  const containerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: 'spring',
        stiffness: 100,
        damping: 15,
      } 
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("w-full", className)}
    >
      <Card className={`${
        isResponsibleScenario 
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800'
          : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Left side - Context info */}
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isResponsibleScenario 
                  ? 'bg-blue-100 dark:bg-blue-900/30' 
                  : 'bg-green-100 dark:bg-green-900/30'
              }`}>
                {isResponsibleScenario ? (
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              
              <div className="flex flex-col">
                {isResponsibleScenario ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Conversando com: {interlocutorName}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Responsável
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Atendimento para: {patientName}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Conversando com: {interlocutorName}
                      </span>
                      <Badge variant="default" className="text-xs">
                        <User className="w-3 h-3 mr-1" />
                        Paciente
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Atendimento direto
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Right side - Status badge */}
            <div className="flex items-center space-x-2">
              <Badge 
                variant={patientStatus === 'MEMBRO' ? 'default' : 'secondary'}
                className={cn(
                  "text-xs",
                  patientStatus === 'MEMBRO' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                )}
              >
                {patientStatus === 'MEMBRO' ? '✓ Membro' : '⏳ Lead'}
              </Badge>
            </div>
          </div>

          {/* Context explanation */}
          {isResponsibleScenario && (
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Contexto:</strong> As perguntas serão direcionadas a você como responsável, 
                  mas as informações médicas e dados de entrega se referem ao paciente <strong>{patientName}</strong>.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}