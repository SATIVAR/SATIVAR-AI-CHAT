'use client';

import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { formatPhoneMask, sanitizePhone } from '@/lib/utils/phone';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange?: (value: string) => void;
  onRawChange?: (rawValue: string) => void;
}

/**
 * Componente de input com máscara automática para telefone
 * Fase 1: Melhoria da Experiência no Frontend (UX)
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ onChange, onRawChange, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const rawValue = sanitizePhone(inputValue);
      const formattedValue = formatPhoneMask(rawValue);
      
      // Chama onChange com o valor formatado para exibição
      if (onChange) {
        onChange(formattedValue);
      }
      
      // Chama onRawChange com o valor sanitizado para processamento
      if (onRawChange) {
        onRawChange(rawValue);
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        value={value}
        onChange={handleChange}
        placeholder="(85) 99999-9999"
        maxLength={15} // (XX) XXXXX-XXXX
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';