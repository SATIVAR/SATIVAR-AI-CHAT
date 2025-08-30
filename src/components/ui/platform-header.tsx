'use client';

import { motion } from 'framer-motion';
import { Logo } from '@/components/icons/logo';

interface PlatformHeaderProps {
  className?: string;
}

export function PlatformHeader({ className = '' }: PlatformHeaderProps) {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className={`text-center space-y-3 ${className}`}>
      {/* Logo Principal do SatiZap - Circular e Centralizada */}
      <motion.div variants={itemVariants} className="mx-auto flex justify-center">
        <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/25 dark:shadow-green-500/10">
          <div className="absolute inset-0 bg-white/10 rounded-full backdrop-blur-sm" />
          <Logo className="w-10 h-10 text-white relative z-10" />
        </div>
      </motion.div>
      
      {/* Título da Plataforma - Mais Elegante */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
          Bem-vindo(a) ao SatiZap!
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Você está iniciando seu atendimento com:
        </p>
      </motion.div>
    </div>
  );
}