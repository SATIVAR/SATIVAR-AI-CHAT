/**
 * Database verification utilities for development debugging
 * Provides functions to verify database state and log detailed information
 */

import { PrismaClient } from '@prisma/client';
import { dbLogger } from './dev-logger';

const prisma = new PrismaClient();

interface DatabaseHealthResult {
  connection: boolean;
  associations: number;
  sativarExists: boolean;
  sativarActive: boolean;
  patients: number;
  errors: string[];
}

interface AssociationVerificationResult {
  exists: boolean;
  isActive: boolean;
  association?: {
    id: string;
    name: string;
    subdomain: string;
    wordpressUrl: string;
    isActive: boolean;
    createdAt: Date;
    patientCount: number;
  };
  error?: string;
}

/**
 * Verify that the "sativar" association exists and is properly configured
 */
export async function verifySativarAssociation(): Promise<AssociationVerificationResult> {
  try {
    dbLogger.log('Verifying sativar association...');
    
    const association = await prisma.association.findUnique({
      where: { subdomain: 'sativar' },
      include: {
        _count: {
          select: {
            Patient: true
          }
        }
      }
    });

    if (!association) {
      const error = 'Association "sativar" not found in database';
      dbLogger.error(error);
      return {
        exists: false,
        isActive: false,
        error
      };
    }

    const result = {
      exists: true,
      isActive: association.isActive,
      association: {
        id: association.id,
        name: association.name,
        subdomain: association.subdomain,
        wordpressUrl: association.wordpressUrl,
        isActive: association.isActive,
        createdAt: association.createdAt,
        patientCount: association._count.Patient
      }
    };

    dbLogger.database('Verify Sativar Association', true, {
      'Association ID': association.id,
      'Name': association.name,
      'Is Active': association.isActive,
      'Patient Count': association._count.Patient
    });

    return result;

  } catch (error) {
    const errorMessage = `Failed to verify sativar association: ${error instanceof Error ? error.message : 'Unknown error'}`;
    dbLogger.error(errorMessage, error instanceof Error ? error : undefined);
    
    return {
      exists: false,
      isActive: false,
      error: errorMessage
    };
  }
}

/**
 * Perform a comprehensive database health check
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const result: DatabaseHealthResult = {
    connection: false,
    associations: 0,
    sativarExists: false,
    sativarActive: false,
    patients: 0,
    errors: []
  };

  try {
    // Test database connection
    dbLogger.log('Testing database connection...');
    await prisma.$connect();
    result.connection = true;
    dbLogger.database('Connection Test', true);

    // Count total associations
    const associationCount = await prisma.association.count();
    result.associations = associationCount;
    dbLogger.database('Count Associations', true, { 'Total': associationCount });

    // Verify sativar association specifically
    const sativarResult = await verifySativarAssociation();
    result.sativarExists = sativarResult.exists;
    result.sativarActive = sativarResult.isActive;
    
    if (sativarResult.association) {
      result.patients = sativarResult.association.patientCount;
    }
    
    if (sativarResult.error) {
      result.errors.push(sativarResult.error);
    }

    // Additional validations
    if (!result.sativarExists) {
      result.errors.push('Sativar association does not exist');
    }
    
    if (result.sativarExists && !result.sativarActive) {
      result.errors.push('Sativar association exists but is not active');
    }

    dbLogger.database('Health Check Complete', result.errors.length === 0, {
      'Total Associations': result.associations,
      'Sativar Exists': result.sativarExists,
      'Sativar Active': result.sativarActive,
      'Errors': result.errors.length
    });

  } catch (error) {
    const errorMessage = `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMessage);
    dbLogger.error(errorMessage, error instanceof Error ? error : undefined);
  } finally {
    await prisma.$disconnect();
  }

  return result;
}

/**
 * Log detailed information about an association by subdomain
 */
export async function logAssociationDetails(subdomain: string): Promise<void> {
  try {
    dbLogger.log(`Fetching details for association: ${subdomain}`);
    
    const association = await prisma.association.findUnique({
      where: { subdomain },
      include: {
        Patient: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
            isActive: true
          },
          take: 5 // Limit to first 5 patients
        },
        _count: {
          select: {
            Patient: true,
            Product: true,
            ProductCategory: true
          }
        }
      }
    });

    if (!association) {
      dbLogger.error(`Association "${subdomain}" not found`);
      return;
    }

    dbLogger.log(`Association "${subdomain}" details:`, {
      id: association.id,
      name: association.name,
      subdomain: association.subdomain,
      isActive: association.isActive,
      wordpressUrl: association.wordpressUrl,
      createdAt: association.createdAt,
      totalPatients: association._count.Patient,
      totalProducts: association._count.Product,
      totalCategories: association._count.ProductCategory,
      samplePatients: association.Patient.map(p => ({
        name: p.name,
        whatsapp: p.whatsapp,
        isActive: p.isActive
      }))
    });

  } catch (error) {
    dbLogger.error(`Failed to fetch association details for "${subdomain}"`, error instanceof Error ? error : undefined);
  }
}

/**
 * Quick verification function that can be called from middleware
 * Returns true if sativar association exists and is active
 */
export async function quickVerifySativar(): Promise<boolean> {
  try {
    const association = await prisma.association.findUnique({
      where: { subdomain: 'sativar' },
      select: { isActive: true }
    });
    
    return association?.isActive === true;
  } catch (error) {
    dbLogger.error('Quick sativar verification failed', error instanceof Error ? error : undefined);
    return false;
  }
}

// Export types
export type { DatabaseHealthResult, AssociationVerificationResult };