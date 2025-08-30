import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromImage } from '@/ai/flows/extract-text-from-image';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo foi enviado' },
        { status: 400 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: 'ID da conversa é obrigatório' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Use JPEG, PNG ou WebP.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 10MB.' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    try {
      // Extract text using Google Cloud Vision
      const extractionResult = await extractTextFromImage({
        imageData: base64Image,
        imageType: file.type,
        fileName: file.name,
      });

      if (!extractionResult.success) {
        return NextResponse.json(
          { error: extractionResult.error || 'Erro ao processar imagem' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        extractedText: extractionResult.extractedText,
        confidence: extractionResult.confidence,
        detectedElements: extractionResult.detectedElements,
        prescriptionData: extractionResult.prescriptionData,
        fileName: file.name,
        fileSize: file.size,
        processingTime: extractionResult.processingTime,
      });

    } catch (error) {
      console.error('Error processing image with OCR:', error);
      return NextResponse.json(
        { error: 'Erro ao extrair texto da imagem. Tente novamente.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in upload API:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Upload endpoint ativo',
      supportedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxSize: '10MB'
    },
    { status: 200 }
  );
}