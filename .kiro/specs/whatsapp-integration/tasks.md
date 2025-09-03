# Implementation Plan

- [x] 1. Set up WAHA infrastructure and development environment





  - Create Docker Compose configuration for WAHA service with proper networking
  - Configure environment variables for WAHA API endpoints and authentication
  - Implement WAHA health check and connection testing utilities
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Extend database schema for WhatsApp integration
  - Create Prisma migration to add WAHA configuration fields to Association model
  - Add WhatsApp-specific fields to Conversation model (channel, session_id, last_message_id)
  - Update Message model to support WhatsApp metadata (delivery status, media URLs)
  - Generate TypeScript types and test database connectivity
  - _Requirements: 7.1, 7.2, 8.1, 8.2, 8.3, 8.4_

- [ ] 3. Implement WhatsApp webhook endpoint
  - Create `/api/webhooks/whatsapp/route.ts` with POST handler for WAHA events
  - Implement webhook payload validation and signature verification
  - Add phone number extraction and normalization logic
  - Integrate association routing based on receiving WhatsApp number
  - _Requirements: 2.1, 2.2, 7.3_

- [ ] 4. Build WhatsApp message service
  - Create `whatsapp.service.ts` with WAHA API integration functions
  - Implement sendTextMessage, sendImageMessage, and sendDocumentMessage methods
  - Add association-specific WAHA configuration retrieval and validation
  - Implement retry logic and error handling for failed message deliveries
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. Integrate patient validation with WhatsApp context
  - Modify existing patient validation service to handle WhatsApp phone numbers
  - Update conversation creation logic to support WhatsApp channel type
  - Implement patient lookup and Lead/Member determination for WhatsApp contacts
  - Add conversation session management for WhatsApp interactions
  - _Requirements: 2.3, 2.4, 2.5, 8.1, 8.2_

- [ ] 6. Adapt AI orchestrator for WhatsApp message processing
  - Modify Hybrid AI Orchestrator to accept WhatsApp-specific input context
  - Update AI response delivery to use WhatsApp service instead of web responses
  - Implement WhatsApp message formatting (remove HTML, handle text limits)
  - Add support for media attachments in AI responses
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 7. Implement human handoff workflow
  - Create handoff logic in AI orchestrator to transition conversations to human queue
  - Update conversation status management for WhatsApp handoff scenarios
  - Implement transition message sending when AI completes its objective
  - Add CRM notification system for new conversations awaiting human attention
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 8. Build CRM inbox interface for WhatsApp conversations
  - Create inbox page component at `/dashboard/[subdomain]/inbox/page.tsx`
  - Implement conversation list with filtering for WhatsApp conversations awaiting attention
  - Build conversation view component displaying complete WhatsApp message history
  - Add patient profile sidebar with context information and order history
  - _Requirements: 6.1, 6.2, 6.3, 6.6_

- [ ] 9. Implement agent message composer for WhatsApp
  - Create message input component for agents to send WhatsApp messages
  - Integrate message composer with WhatsApp service for outbound delivery
  - Add support for sending images and documents through agent interface
  - Implement conversation status updates when agents take over conversations
  - _Requirements: 6.4, 6.5, 6.6_

- [ ] 10. Add real-time updates to CRM interface
  - Implement WebSocket connection for real-time conversation updates
  - Add auto-refresh functionality for new messages and status changes
  - Create notification system for agents when new conversations arrive
  - Implement typing indicators and message delivery status display
  - _Requirements: 6.1, 6.2, 6.5_

- [ ] 11. Create association configuration interface for WAHA settings
  - Add WAHA configuration fields to association management interface
  - Implement WAHA connection testing and validation in admin panel
  - Create setup wizard for connecting WhatsApp Business numbers via QR code
  - Add monitoring dashboard for WAHA session status and message statistics
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 12. Implement comprehensive error handling and monitoring
  - Add circuit breaker pattern for WAHA API calls with fallback messaging
  - Create dead letter queue for permanently failed message deliveries
  - Implement health monitoring for WAHA instances with alerting
  - Add comprehensive logging for WhatsApp message flow debugging
  - _Requirements: 4.3, 4.4, 7.4_

- [ ] 13. Write comprehensive tests for WhatsApp integration
  - Create unit tests for webhook payload processing and validation
  - Write integration tests for WhatsApp service API calls and error scenarios
  - Implement end-to-end tests for complete message flow from WhatsApp to AI response
  - Add load tests for concurrent message processing and WAHA API limits
  - _Requirements: All requirements validation_

- [ ] 14. Create deployment configuration and documentation
  - Update Docker Compose for production WAHA deployment
  - Create environment variable documentation for WAHA configuration
  - Write setup guide for connecting WhatsApp Business numbers
  - Document troubleshooting procedures for common WAHA integration issues
  - _Requirements: 1.1, 1.2, 7.1, 7.2_