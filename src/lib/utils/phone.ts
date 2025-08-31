/**
 * Fase 1: Implementação da Camada de Sanitização no SatiZap
 * Funções utilitárias para normalização e formatação de números de telefone
 */

/**
 * Sanitiza um número de telefone removendo todos os caracteres não numéricos
 * @param phone - Número de telefone em qualquer formato
 * @returns Número limpo contendo apenas dígitos
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Aplica máscara de formatação ao número de telefone brasileiro
 * @param phone - Número de telefone (apenas dígitos)
 * @returns Número formatado no padrão (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatPhoneMask(phone: string): string {
  const cleaned = sanitizePhone(phone);
  
  if (cleaned.length <= 2) {
    return `(${cleaned}`;
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  } else if (cleaned.length === 10) {
    // Telefone fixo: (XX) XXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    // Celular: (XX) XXXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length > 11) {
    // Limita a 11 dígitos e formata como celular
    const limited = cleaned.slice(0, 11);
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  } else {
    // Casos intermediários (7-9 dígitos)
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
}

/**
 * Valida se um número de telefone tem o formato correto
 * @param phone - Número de telefone sanitizado
 * @returns true se válido, false caso contrário
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = sanitizePhone(phone);
  return cleaned.length >= 10 && cleaned.length <= 11;
}

/**
 * Extrai apenas os dígitos de um número de telefone para envio à API
 * @param phone - Número de telefone em qualquer formato
 * @returns Número sanitizado para uso em APIs
 */
export function getPhoneForAPI(phone: string): string {
  return sanitizePhone(phone);
}