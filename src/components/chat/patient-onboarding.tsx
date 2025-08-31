'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PatientFormData } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { OnboardingForm } from './onboarding-form';
import { AssociationCard } from '@/components/ui/association-card';
import { PlatformHeader } from '@/components/ui/platform-header';



interface PatientOnboardingProps {
  onSubmit: (data: PatientFormData & { cpf?: string }, isReturning?: boolean) => Promise<void>;
  isLoading?: boolean;
  associationData?: AssociationDisplayInfo | null;
}

// Add interface for association display info
interface AssociationDisplayInfo {
  name: string;
  publicDisplayName?: string;
  logoUrl?: string;
  welcomeMessage?: string;
  descricaoPublica?: string;
}

export function PatientOnboarding({ onSubmit, isLoading = false, associationData }: PatientOnboardingProps) {
  // Use the association data passed as props, with fallback for SatiZap platform
  const associationInfo = associationData || { name: 'SatiZap' };
  const isLoadingAssociation = false; // No longer needed since data comes from props

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2,
      } 
    },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  // Show loading skeleton while fetching association info
  if (isLoadingAssociation) {
    return (
      <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-4">
        <div className="absolute inset-0 bg-[url('/medical-pattern.png')] bg-repeat opacity-5 dark:opacity-10" />
        <div className="z-10 w-full max-w-md">
          <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4 pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Skeleton className="w-8 h-8 rounded" />
              </div>
              <div>
                <Skeleton className="h-8 w-48 mx-auto mb-2" />
                <Skeleton className="h-4 w-64 mx-auto mb-3" />
                <Skeleton className="h-4 w-72 mx-auto" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Get display values with fallbacks
  const displayName = associationInfo?.publicDisplayName || associationInfo?.name || 'SatiZap';

  return (
    <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-4">
      <div className="absolute inset-0 bg-[url('/medical-pattern.png')] bg-repeat opacity-5 dark:opacity-10" />
      
      <motion.div 
        className="z-10 w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <Card className="shadow-xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
          <CardHeader className="text-center space-y-4 pb-3">
            {/* 1. Componente PlatformHeader - Logo e Título do SatiZap */}
            <motion.div variants={itemVariants}>
              <PlatformHeader />
            </motion.div>



            {/* 3. Componente AssociationCard */}
            <motion.div variants={itemVariants} className="w-full">
              <AssociationCard 
                associationData={{
                  name: displayName,
                  logoUrl: associationInfo?.logoUrl,
                  welcomeMessage: associationInfo?.welcomeMessage
                }}
              />
            </motion.div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-2">
            {/* 4. Formulário de WhatsApp com Confirmação */}
            <OnboardingForm 
              onSubmit={onSubmit}
              isLoading={isLoading}
            />

            {/* 5. Nota de Privacidade */}
            <motion.div variants={itemVariants} className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>
                Seus dados são protegidos e utilizados apenas para melhorar sua experiência de cuidado.
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}