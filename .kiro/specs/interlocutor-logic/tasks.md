# Implementation Plan

- [x] 1. Create Context Analyzer Service





  - Implement service to analyze ACF data and determine interlocutor type
  - Create TypeScript interfaces for InterlocutorContext and related types
  - Write methods to identify patient vs responsible scenarios
  - Add unit tests for context analysis logic
  - _Requirements: 1.2, 1.3_

- [x] 2. Enhance Patient Service with ACF data preservation





  - Fix the data mapping bug in syncPatientWithWordPressACF method
  - Ensure ACF fields are properly preserved during WordPress sync
  - Add validation for ACF data integrity
  - Implement logging for sync discrepancies
  - Write tests for ACF data preservation
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3. Create database migration for new patient fields





  - Add migration script to include tipo_associacao, nome_responsavel, cpf_responsavel columns
  - Create database indexes for performance optimization
  - Add acf_sync_status and last_context_update fields
  - Test migration with existing data
  - _Requirements: 5.3, 6.1_

- [ ] 4. Implement contextual welcome message logic
  - Create ContextualMessage React component
  - Implement logic to generate different welcome messages for patient vs responsible
  - Add InterlocutorBadge component to show context visually
  - Update PatientConfirmation component to use contextual messages
  - Write tests for message generation logic
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [ ] 5. Update API response to include interlocutor context
  - Modify validate-whatsapp-simple API to analyze and return context data
  - Ensure patientData response includes interlocutorContext field
  - Add context analysis to existing patient lookup logic
  - Test API responses for both patient and responsible scenarios
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3_

- [ ] 6. Enhance AI Response Engine with contextual prompts
  - Update ResponseEngineService to use interlocutor context
  - Modify AI prompts to address correct person (patient vs responsible)
  - Implement different question formulations based on context
  - Add contextual message templates for different scenarios
  - Write tests for AI context adaptation
  - _Requirements: 3.2, 3.3, 4.4, 4.5_

- [ ] 7. Create chat session context management
  - Implement ChatSessionContext interface and storage
  - Add context persistence during chat sessions
  - Ensure context consistency throughout conversation
  - Create context provider for React components
  - Test context maintenance across chat interactions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 8. Add error handling and fallback mechanisms
  - Implement ACFSyncErrorHandler for data sync failures
  - Add context resolution fallbacks for ambiguous cases
  - Create graceful degradation when context cannot be determined
  - Add comprehensive error logging and monitoring
  - Test error scenarios and recovery mechanisms
  - _Requirements: 1.5, 5.4, 5.5_

- [ ] 9. Update administrative interface to show interlocutor data
  - Modify patient management interface to display tipo_associacao
  - Add responsible person information display
  - Show context indicators in patient listings
  - Add filtering by association type
  - Test administrative interface updates
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 10. Implement comprehensive testing suite
  - Create integration tests for complete interlocutor flow
  - Add end-to-end tests for patient and responsible scenarios
  - Test WordPress ACF data sync with context preservation
  - Validate UI components with different context types
  - Test AI responses for contextual accuracy
  - _Requirements: All requirements validation_

- [ ] 11. Add monitoring and observability features
  - Implement ContextMetrics tracking for scenario distribution
  - Add logging for context resolution and sync health
  - Create alerts for context resolution failures
  - Add performance monitoring for context analysis
  - Test monitoring and alerting systems
  - _Requirements: 5.4, 5.5_

- [ ] 12. Create data migration and backfill utilities
  - Implement MigrationService to backfill existing patient data
  - Add validation for migrated data integrity
  - Create rollback mechanisms for failed migrations
  - Test migration with production-like data volumes
  - Document migration procedures
  - _Requirements: 5.5, 6.4_