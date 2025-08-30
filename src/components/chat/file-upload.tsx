'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, FileImage, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File, extractedData: any) => void;
  conversationId: string;
  disabled?: boolean;
}

export function FileUpload({ onFileUpload, conversationId, disabled = false }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de arquivo não suportado. Use JPEG, PNG ou WebP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Tamanho máximo: 10MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('conversationId', conversationId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar arquivo');
      }

      onFileUpload(selectedFile, result);
      resetUpload();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* File Drop Zone */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
            onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
              disabled={disabled || isUploading}
            />

            <div className="flex flex-col items-center space-y-2">
              <FileImage className="h-8 w-8 text-gray-400" />
              <div className="text-sm">
                {selectedFile ? (
                  <span className="font-medium">{selectedFile.name}</span>
                ) : (
                  <>
                    <span className="font-medium">Enviar prescrição médica</span>
                    <br />
                    <span className="text-gray-500">JPEG, PNG ou WebP (máx. 10MB)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-32 object-cover rounded-lg border"
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={resetUpload}
                disabled={isUploading}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          {/* Action Buttons */}
          {selectedFile && (
            <div className="flex space-x-2">
              <Button
                onClick={handleUpload}
                disabled={disabled || isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isUploading ? 'Processando...' : 'Analisar Prescrição'}
              </Button>
              <Button
                onClick={resetUpload}
                variant="outline"
                disabled={isUploading}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}