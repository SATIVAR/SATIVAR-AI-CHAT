'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Building2, CheckCircle, Info } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AssociationCardProps {
  associationData: {
    name: string;
    logoUrl?: string;
    welcomeMessage?: string;
  };
}

export function AssociationCard({ associationData }: AssociationCardProps) {
  const { name, logoUrl, welcomeMessage } = associationData;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const defaultWelcomeMessage = `Bem-vindo à ${name}! Medicamentos e Atendimento à SATIVAR nasce para revolucionar o processo de atendimento com sistemas multiusuário inteligente e ágeis de IA.`;
  const displayMessage = welcomeMessage || defaultWelcomeMessage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-800/30 shadow-md shadow-blue-500/10 dark:shadow-blue-500/5"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-gradient-to-br from-blue-100/20 to-indigo-100/20 dark:from-blue-900/10 dark:to-indigo-900/10" />
      </div>
      
      <div className="relative p-3">
        {/* Header compacto com Logo, Nome e Botão Info */}
        <div className="flex items-center gap-2">
          {/* Logo da Associação - menor */}
          <div className="flex-shrink-0">
            {logoUrl ? (
              <div className="w-8 h-8 relative bg-white rounded-lg p-1 shadow-sm ring-1 ring-blue-100 dark:ring-blue-800/50">
                <Image
                  src={logoUrl}
                  alt={`Logo ${name}`}
                  fill
                  className="object-contain rounded"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center text-white font-bold text-xs">${name.charAt(0)}</div>`;
                    }
                  }}
                />
              </div>
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <Building2 className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Nome e Status - compacto */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">
                {name}
              </h3>
              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
            </div>
          </div>

          {/* Botão para abrir modal com mensagem de boas-vindas */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                <Info className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 pb-4 mb-0">
                <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
                  {logoUrl ? (
                    <div className="w-12 h-12 relative bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm ring-1 ring-blue-100 dark:ring-blue-800/50">
                      <Image
                        src={logoUrl}
                        alt={`Logo ${name}`}
                        fill
                        className="object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-gray-900 dark:text-gray-100 leading-tight">{name}</span>
                    <span className="text-sm font-normal text-gray-600 dark:text-gray-400">Informações da Associação</span>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-1">
                <div className="mt-4">
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/30">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {displayMessage}
                    </p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </motion.div>
  );
}