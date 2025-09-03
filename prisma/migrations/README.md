# Database Migrations

This directory contains database migration scripts for the SatiZap project.

## Migration 001: Interlocutor Context Fields

**File:** `001_add_interlocutor_context_fields.sql`  
**Date:** 2025-09-01  
**Purpose:** Add database fields and indexes to support interlocutor logic functionality

### Changes Made

#### New Columns Added to Patient Table:
- `acf_sync_status` (VARCHAR(20), DEFAULT 'pending') - Tracks ACF data synchronization status
- `last_context_update` (TIMESTAMP, NULL) - Tracks when context was last analyzed

#### New Indexes Created:
- `Patient_whatsapp_association_idx` - Composite index on (whatsapp, associationId)
- `Patient_tipo_associacao_idx` - Index on tipo_associacao field
- `Patient_context_update_idx` - Index on last_context_update field  
- `Patient_context_lookup_idx` - Composite index on (whatsapp, associationId, tipo_associacao)

### Running the Migration

#### Option 1: Using npm scripts (Recommended)
```bash
# Run the migration
npm run migrate:interlocutor

# Test the migration
npm run migrate:interlocutor:test

# Rollback if needed (use with caution)
npm run migrate:interlocutor:rollback
```

#### Option 2: Direct script execution
```bash
# Run the migration
node scripts/migrate-interlocutor-fields.js

# Test the migration
node scripts/test-interlocutor-migration.js

# Rollback if needed
node scripts/rollback-interlocutor-fields.js
```

#### Option 3: Manual SQL execution
Execute the SQL statements in `001_add_interlocutor_context_fields.sql` directly in your database client.

### Migration Scripts

#### `scripts/migrate-interlocutor-fields.js`
- Main migration script that applies the database changes
- Includes error handling for existing columns/indexes
- Provides verification and testing
- Generates migration report

#### `scripts/test-interlocutor-migration.js`
- Comprehensive test suite for the migration
- Tests schema changes, data integrity, query performance
- Validates CRUD operations with new fields
- Generates detailed migration report

#### `scripts/rollback-interlocutor-fields.js`
- Rollback script to undo the migration
- Creates backup of data before deletion
- Removes columns and indexes safely
- Use with extreme caution in production

### Validation

After running the migration, verify:

1. **Schema Changes:**
   - New columns exist with correct data types
   - Indexes are created and functional
   - Default values are applied correctly

2. **Data Integrity:**
   - Existing patient data is preserved
   - Sync status is properly initialized
   - No data corruption occurred

3. **Performance:**
   - Context lookup queries use appropriate indexes
   - Query performance is acceptable
   - No significant performance degradation

### Rollback Procedure

If you need to rollback this migration:

1. **Backup Data:** The rollback script automatically creates a backup
2. **Run Rollback:** Use `npm run migrate:interlocutor:rollback`
3. **Verify:** Check that columns and indexes are removed
4. **Update Schema:** Revert the Prisma schema changes if needed

### Troubleshooting

#### Common Issues:

1. **Permission Errors:**
   - Ensure database user has ALTER TABLE privileges
   - Check if user can create indexes

2. **Column Already Exists:**
   - Migration script handles this gracefully
   - Check if partial migration was already applied

3. **Index Creation Fails:**
   - Check for existing indexes with same name
   - Verify table has sufficient data for index creation

4. **Performance Issues:**
   - Monitor query performance after migration
   - Consider running ANALYZE TABLE if needed

### Requirements Satisfied

This migration satisfies the following requirements from the interlocutor logic specification:

- **Requirement 5.3:** Database fields for ACF data synchronization tracking
- **Requirement 6.1:** Administrative interface support with proper indexing
- **Performance Optimization:** Indexes for efficient context queries
- **Data Integrity:** Proper field types and constraints

### Next Steps

After successful migration:

1. Update application code to use new fields
2. Implement context analysis logic
3. Update administrative interfaces
4. Monitor performance and adjust indexes if needed
5. Consider data backfill for existing patients

### Support

For issues with this migration:
1. Check the migration test results
2. Review the generated migration report
3. Verify database permissions and connectivity
4. Consult the troubleshooting section above