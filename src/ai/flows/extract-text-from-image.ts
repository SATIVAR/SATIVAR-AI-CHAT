'use server';

/**
 * @fileOverview This file defines the Genkit flow for extracting text from medical prescription images.
 * Specifically designed for SATIZAP to analyze cannabis medicinal prescriptions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractTextFromImageInputSchema = z.object({
  imageData: z.string().describe('Base64 encoded image data'),
  imageType: z.string().describe('MIME type of the image (e.g., image/jpeg)'),
  fileName: z.string().optional().describe('Original filename'),
});

export type ExtractTextFromImageInput = z.infer<typeof ExtractTextFromImageInputSchema>;

const ExtractTextFromImageOutputSchema = z.object({
  success: z.boolean(),
  extractedText: z.string().describe('Raw text extracted from the image'),
  confidence: z.number().min(0).max(1).describe('Confidence level of the extraction'),
  detectedElements: z.object({
    doctorName: z.string().optional(),
    patientName: z.string().optional(),
    crm: z.string().optional(),
    prescriptionDate: z.string().optional(),
    medications: z.array(z.object({
      name: z.string(),
      dosage: z.string().optional(),
      frequency: z.string().optional(),
      duration: z.string().optional(),
    })).optional(),
  }).optional(),
  prescriptionData: z.object({
    isValidPrescription: z.boolean(),
    containsCannabis: z.boolean(),
    cannabisProducts: z.array(z.string()).optional(),
    recommendedTreatment: z.string().optional(),
  }).optional(),
  error: z.string().optional(),
  processingTime: z.number().optional(),
});

export type ExtractTextFromImageOutput = z.infer<typeof ExtractTextFromImageOutputSchema>;

export const extractTextFromImage = ai.defineFlow(
  {
    name: 'extractTextFromImage',
    inputSchema: ExtractTextFromImageInputSchema,
    outputSchema: ExtractTextFromImageOutputSchema,
  },
  async (input) => {
    const { imageData, imageType, fileName } = input;
    const startTime = Date.now();
    
    try {
      // Create data URI for Gemini
      const dataUri = `data:${imageType};base64,${imageData}`;
      
      const prompt = `Você é um especialista em análise de prescrições médicas, especialmente para cannabis medicinal.

Analise a imagem fornecida e extraia TODAS as informações de texto, prestando atenção especial a:

1. **EXTRAÇÃO DE TEXTO COMPLETA**: Extraia todo o texto visível na imagem, mantendo a formatação original

2. **IDENTIFICAÇÃO DE ELEMENTOS MÉDICOS**:
   - Nome do médico e CRM
   - Nome do paciente
   - Data da prescrição
   - Medicamentos prescritos (nome, dosagem, frequência, duração)
   - Carimbo/assinatura médica

3. **ANÁLISE ESPECÍFICA PARA CANNABIS MEDICINAL**:
   - Identifique se há prescrição de cannabis medicinal ou derivados
   - Produtos específicos mencionados (CBD, THC, óleos, extratos)
   - Concentrações e dosagens
   - Indicações terapêuticas

4. **VALIDAÇÃO**:
   - Determine se é uma prescrição médica válida
   - Verifique presença de elementos obrigatórios

Forneça uma análise estruturada e completa da prescrição.

Imagem: {{media url="${dataUri}"}}`;

      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt,
        config: {
          temperature: 0.1, // Low temperature for accuracy
          maxOutputTokens: 2048,
        },
      });

      const extractedText = response.text || '';
      
      // Basic analysis of extracted text
      const lowerText = extractedText.toLowerCase();
      const containsCannabis = (
        lowerText.includes('cannabis') ||
        lowerText.includes('cbd') ||
        lowerText.includes('thc') ||
        lowerText.includes('canabidiol') ||
        lowerText.includes('tetrahidrocanabinol') ||
        lowerText.includes('óleo de cannabis') ||
        lowerText.includes('extrato')
      );

      const isValidPrescription = (
        lowerText.includes('crm') ||
        lowerText.includes('médico') ||
        lowerText.includes('prescrição') ||
        lowerText.includes('receita') ||
        (lowerText.includes('dr.') || lowerText.includes('dra.'))
      );

      // Extract cannabis products mentioned
      const cannabisProducts: string[] = [];
      const cannabisKeywords = ['cbd', 'thc', 'canabidiol', 'cannabis', 'óleo', 'extrato'];
      
      cannabisKeywords.forEach(keyword => {
        if (lowerText.includes(keyword)) {
          cannabisProducts.push(keyword.toUpperCase());
        }
      });

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        extractedText,
        confidence: extractedText.length > 50 ? 0.9 : 0.6, // Simple confidence metric
        detectedElements: {
          // These would be more sophisticated with proper NLP/regex parsing
          doctorName: extractDoctorName(extractedText),
          patientName: extractPatientName(extractedText),
          crm: extractCRM(extractedText),
          prescriptionDate: extractDate(extractedText),
        },
        prescriptionData: {
          isValidPrescription,
          containsCannabis,
          cannabisProducts: cannabisProducts.length > 0 ? [...new Set(cannabisProducts)] : undefined,
          recommendedTreatment: containsCannabis ? 'Cannabis medicinal identificada na prescrição' : undefined,
        },
        processingTime,
      };

    } catch (error) {
      console.error('Error in extractTextFromImage:', error);
      
      return {
        success: false,
        extractedText: '',
        confidence: 0,
        error: 'Erro ao processar a imagem. Verifique se a imagem está clara e tente novamente.',
        processingTime: Date.now() - startTime,
      };
    }
  }
);

// Helper functions for extracting specific information
function extractDoctorName(text: string): string | undefined {
  const patterns = [
    /Dr\.?\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)/,
    /Dra\.?\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)/,
    /Médico\(a\)\s*:?\s*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  
  return undefined;
}

function extractPatientName(text: string): string | undefined {
  const patterns = [
    /Paciente\s*:?\s*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)/,
    /Nome\s*:?\s*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  
  return undefined;
}

function extractCRM(text: string): string | undefined {
  const pattern = /CRM[\s-]*([0-9]+[\s-]*\/[\s-]*[A-Z]{2}|[0-9]+)/i;
  const match = text.match(pattern);
  return match ? match[1] : undefined;
}

function extractDate(text: string): string | undefined {
  const patterns = [
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
    /\b(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})\b/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  
  return undefined;
}
