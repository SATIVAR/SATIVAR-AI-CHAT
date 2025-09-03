import { describe, test, expect, beforeEach, vi, Mock } from 'vitest';
import { 
  syncPatientWithWordPressACF,
  findPatientByWhatsapp,
  createPatient,
  updatePatient
} from '../patient.service';
import { Patient, PatientFormData } from '@/lib/types';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    patient: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }
  }
}));

// Mock phone utilities
vi.mock('@/lib/utils/phone', () => ({
  sanitizePhone: vi.fn((phone: string) => phone.replace(/\D/g, '')),
  isValidPhone: vi.fn(() => true)
}));

describe('Enhanced Patient Service - Task 2 Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('syncPatientWithWordPressACF', () => {
    const mockAssociationId = 'test-association-id';
    const mockWhatsapp = '11999999999';

    test('should successfully sync patient with complete ACF data', async () => {
      const mockWordPressData = {
        id: 123,
        name: 'João Silva',
        email: 'joao@example.com',
        acf: {
          telefone: '11999999999',
          nome_completo: 'João Silva',
          cpf: '12345678901',
          tipo_associacao: 'assoc_paciente',
          nome_responsavel: null,
          cpf_responsavel: null
        }
      };

      // Mock findPatientByWhatsapp to return null (new patient)
      const mockFindPatient = vi.fn().mockResolvedValue(null);
      vi.doMock('../patient.service', async () => {
        const actual = await vi.importActual('../patient.service');
        return {
          ...actual,
          findPatientByWhatsapp: mockFindPatient
        };
      });

      // Mock createPatient to return success
      const mockCreatePatient = vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'patient-123',
          name: 'João Silva',
          whatsapp: '11999999999',
          cpf: '12345678901',
          tipo_associacao: 'assoc_paciente',
          status: 'MEMBRO',
          wordpress_id: '123'
        }
      });

      vi.doMock('../patient.service', async () => {
        const actual = await vi.importActual('../patient.service');
        return {
          ...actual,
          findPatientByWhatsapp: mockFindPatient,
          createPatient: mockCreatePatient
        };
      });

      const result = await syncPatientWithWordPressACF(
        mockWhatsapp,
        mockWordPressData,
        mockAssociationId
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.syncMetadata).toBeDefined();
      expect(result.syncMetadata?.operation).toBe('create');
      expect(result.syncMetadata?.acfFieldsCount).toBe(6);
      expect(result.syncMetadata?.validationPassed).toBe(true);
    });

    test('should handle responsible person scenario correctly', async () => {
      const mockWordPressData = {
        id: 456,
        name: 'Maria Silva',
        email: 'maria@example.com',
        acf: {
          telefone: '11888888888',
          nome_completo: 'Pedro Silva',
          cpf: '98765432100',
          tipo_associacao: 'assoc_respon',
          nome_responsavel: 'Maria Silva',
          cpf_responsavel: '12345678901'
        }
      };

      const mockFindPatient = vi.fn().mockResolvedValue(null);
      const mockCreatePatient = vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'patient-456',
          name: 'Pedro Silva',
          whatsapp: '11888888888',
          cpf: '98765432100',
          tipo_associacao: 'assoc_respon',
          nome_responsavel: 'Maria Silva',
          cpf_responsavel: '12345678901',
          status: 'MEMBRO',
          wordpress_id: '456'
        }
      });

      vi.doMock('../patient.service', async () => {
        const actual = await vi.importActual('../patient.service');
        return {
          ...actual,
          findPatientByWhatsapp: mockFindPatient,
          createPatient: mockCreatePatient
        };
      });

      const result = await syncPatientWithWordPressACF(
        '11888888888',
        mockWordPressData,
        mockAssociationId
      );

      expect(result.success).toBe(true);
      expect(result.data?.nome_responsavel).toBe('Maria Silva');
      expect(result.data?.cpf_responsavel).toBe('12345678901');
      expect(result.syncMetadata?.validationPassed).toBe(true);
    });

    test('should detect and log ACF validation failures', async () => {
      const mockWordPressDataInvalid = {
        id: 789,
        name: 'Invalid User',
        acf: [] // Invalid: ACF should be object, not array
      };

      const mockFindPatient = vi.fn().mockResolvedValue(null);
      const mockCreatePatient = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'patient-789' }
      });

      vi.doMock('../patient.service', async () => {
        const actual = await vi.importActual('../patient.service');
        return {
          ...actual,
          findPatientByWhatsapp: mockFindPatient,
          createPatient: mockCreatePatient
        };
      });

      const consoleSpy = vi.spyOn(console, 'warn');

      const result = await syncPatientWithWordPressACF(
        '11777777777',
        mockWordPressDataInvalid,
        mockAssociationId
      );

      expect(result.success).toBe(true); // Should still succeed with fallback
      expect(result.syncMetadata?.validationPassed).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ACF validation failed'),
        expect.any(Array)
      );
    });

    test('should detect data discrepancies when updating existing patient', async () => {
      const existingPatient: Patient = {
        id: 'existing-123',
        name: 'João Santos', // Different from WordPress
        whatsapp: '11999999999',
        email: 'joao.old@example.com',
        cpf: '12345678901',
        tipo_associacao: 'assoc_paciente',
        nome_responsavel: null,
        cpf_responsavel: null,
        status: 'MEMBRO',
        wordpress_id: '123',
        isActive: true,
        associationId: mockAssociationId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockWordPressData = {
        id: 123,
        name: 'João Silva', // Different name
        email: 'joao.new@example.com', // Different email
        acf: {
          telefone: '11999999999',
          nome_completo: 'João Silva',
          cpf: '12345678901',
          tipo_associacao: 'assoc_paciente'
        }
      };

      const mockFindPatient = vi.fn().mockResolvedValue(existingPatient);
      const mockUpdatePatient = vi.fn().mockResolvedValue({
        success: true,
        data: { ...existingPatient, name: 'João Silva', email: 'joao.new@example.com' }
      });

      vi.doMock('../patient.service', async () => {
        const actual = await vi.importActual('../patient.service');
        return {
          ...actual,
          findPatientByWhatsapp: mockFindPatient,
          updatePatient: mockUpdatePatient
        };
      });

      const consoleErrorSpy = vi.spyOn(console, 'error');

      const result = await syncPatientWithWordPressACF(
        mockWhatsapp,
        mockWordPressData,
        mockAssociationId
      );

      expect(result.success).toBe(true);
      expect(result.syncMetadata?.operation).toBe('update');
      expect(result.syncMetadata?.discrepanciesFound).toBeGreaterThan(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('SYNC DISCREPANCY [DATA_DISCREPANCY_DETECTED]'),
        expect.any(Object)
      );
    });

    test('should handle missing ACF data gracefully', async () => {
      const mockWordPressDataNoACF = {
        id: 999,
        name: 'User Without ACF',
        email: 'user@example.com'
        // No ACF data
      };

      const mockFindPatient = vi.fn().mockResolvedValue(null);
      const mockCreatePatient = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'patient-999' }
      });

      vi.doMock('../patient.service', async () => {
        const actual = await vi.importActual('../patient.service');
        return {
          ...actual,
          findPatientByWhatsapp: mockFindPatient,
          createPatient: mockCreatePatient
        };
      });

      const result = await syncPatientWithWordPressACF(
        '11666666666',
        mockWordPressDataNoACF,
        mockAssociationId
      );

      expect(result.success).toBe(true);
      expect(result.syncMetadata?.validationPassed).toBe(false);
      expect(result.syncMetadata?.acfFieldsCount).toBe(0);
    });

    test('should handle sync exceptions and log detailed error information', async () => {
      const mockWordPressData = {
        id: 'invalid-id', // This might cause issues
        acf: {
          telefone: '11555555555',
          nome_completo: 'Test User'
        }
      };

      // Mock findPatientByWhatsapp to throw an error
      const mockFindPatient = vi.fn().mockRejectedValue(new Error('Database connection failed'));

      vi.doMock('../patient.service', async () => {
        const actual = await vi.importActual('../patient.service');
        return {
          ...actual,
          findPatientByWhatsapp: mockFindPatient
        };
      });

      const consoleErrorSpy = vi.spyOn(console, 'error');

      const result = await syncPatientWithWordPressACF(
        '11555555555',
        mockWordPressData,
        mockAssociationId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Enhanced ACF Sync');
      expect(result.syncMetadata?.operation).toBe('failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Enhanced ACF Sync Error'),
        expect.any(Error)
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('SYNC DISCREPANCY [SYNC_EXCEPTION]'),
        expect.any(Object)
      );
    });

    test('should preserve all ACF fields without modification', async () => {
      const mockWordPressData = {
        id: 111,
        name: 'Test User',
        acf: {
          telefone: '11444444444',
          nome_completo: 'Test User',
          cpf: '11111111111',
          tipo_associacao: 'assoc_paciente',
          custom_field_1: 'custom_value_1',
          custom_field_2: 'custom_value_2',
          nested_object: {
            nested_field: 'nested_value'
          }
        }
      };

      const mockFindPatient = vi.fn().mockResolvedValue(null);
      const mockCreatePatient = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'patient-111' }
      });

      vi.doMock('../patient.service', async () => {
        const actual = await vi.importActual('../patient.service');
        return {
          ...actual,
          findPatientByWhatsapp: mockFindPatient,
          createPatient: mockCreatePatient
        };
      });

      const consoleLogSpy = vi.spyOn(console, 'log');

      const result = await syncPatientWithWordPressACF(
        '11444444444',
        mockWordPressData,
        mockAssociationId
      );

      expect(result.success).toBe(true);
      expect(result.syncMetadata?.acfFieldsCount).toBe(7); // All fields preserved

      // Check that preservation logging occurred
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('ACF Fields Preservation'),
        expect.objectContaining({
          fieldCount: 7,
          fields: expect.arrayContaining(['telefone', 'nome_completo', 'custom_field_1'])
        })
      );
    });
  });

  describe('ACF Data Validation', () => {
    test('should validate required fields correctly', async () => {
      const validData = {
        acf: {
          telefone: '11999999999',
          nome_completo: 'Valid User',
          cpf: '12345678901'
        }
      };

      const invalidData = {
        acf: {
          // Missing required fields
          cpf: '12345678901'
        }
      };

      // We can't directly test the internal validation function,
      // but we can test its effects through the main sync function
      const mockFindPatient = vi.fn().mockResolvedValue(null);
      const mockCreatePatient = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'test' }
      });

      vi.doMock('../patient.service', async () => {
        const actual = await vi.importActual('../patient.service');
        return {
          ...actual,
          findPatientByWhatsapp: mockFindPatient,
          createPatient: mockCreatePatient
        };
      });

      // Test valid data
      const validResult = await syncPatientWithWordPressACF(
        '11999999999',
        validData,
        'test-association'
      );
      expect(validResult.syncMetadata?.validationPassed).toBe(true);

      // Test invalid data
      const invalidResult = await syncPatientWithWordPressACF(
        '11888888888',
        invalidData,
        'test-association'
      );
      expect(invalidResult.syncMetadata?.validationPassed).toBe(false);
    });
  });

  describe('Data Discrepancy Detection', () => {
    test('should detect field-level discrepancies with correct severity', async () => {
      const existingPatient: Patient = {
        id: 'test-123',
        name: 'Old Name',
        whatsapp: '11999999999',
        email: 'old@example.com',
        cpf: '11111111111',
        tipo_associacao: 'assoc_paciente',
        nome_responsavel: null,
        cpf_responsavel: null,
        status: 'MEMBRO',
        wordpress_id: '123',
        isActive: true,
        associationId: 'test-association',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const newWordPressData = {
        id: 123,
        name: 'New Name',
        email: 'new@example.com',
        acf: {
          telefone: '11999999999',
          nome_completo: 'New Name',
          cpf: '22222222222', // High importance change
          tipo_associacao: 'assoc_respon', // High importance change
          nome_responsavel: 'New Responsible', // Medium importance change
        }
      };

      const mockFindPatient = vi.fn().mockResolvedValue(existingPatient);
      const mockUpdatePatient = vi.fn().mockResolvedValue({
        success: true,
        data: existingPatient
      });

      vi.doMock('../patient.service', async () => {
        const actual = await vi.importActual('../patient.service');
        return {
          ...actual,
          findPatientByWhatsapp: mockFindPatient,
          updatePatient: mockUpdatePatient
        };
      });

      const result = await syncPatientWithWordPressACF(
        '11999999999',
        newWordPressData,
        'test-association'
      );

      expect(result.success).toBe(true);
      expect(result.syncMetadata?.discrepanciesFound).toBeGreaterThan(0);
      expect(result.syncMetadata?.previousData).toEqual(existingPatient);
    });
  });
});