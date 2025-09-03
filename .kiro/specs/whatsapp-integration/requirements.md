# Requirements Document

## Introduction

SatiZap v2.0 transforms the platform from a web-based chat system to a native WhatsApp integration that provides seamless conversational automation and human handoff capabilities. The system will use WAHA (WhatsApp HTTP API) as a bridge to receive patient messages, process them through the existing AI engine, and enable human agents to take over conversations through an integrated CRM interface, all while keeping patients within their familiar WhatsApp environment.

## Requirements

### Requirement 1: WAHA Infrastructure Setup

**User Story:** As a system administrator, I want to configure WAHA infrastructure so that the SatiZap platform can communicate with WhatsApp Business API.

#### Acceptance Criteria

1. WHEN the development environment is set up THEN the system SHALL provide a Docker Compose configuration for WAHA
2. WHEN WAHA is deployed THEN the system SHALL expose API endpoints accessible by the SatiZap application
3. WHEN a WhatsApp number is connected THEN the system SHALL authenticate via QR code and maintain connection status
4. WHEN WAHA receives WhatsApp messages THEN the system SHALL forward them to SatiZap webhook endpoints

### Requirement 2: WhatsApp Webhook Integration

**User Story:** As a patient, I want to send messages via WhatsApp so that I can interact with the SatiZap AI without leaving my preferred messaging platform.

#### Acceptance Criteria

1. WHEN a patient sends a WhatsApp message THEN the system SHALL receive it via /api/webhooks/whatsapp endpoint
2. WHEN a webhook payload is received THEN the system SHALL extract sender number, message content, and media attachments
3. WHEN the sender number is extracted THEN the system SHALL validate the patient against the WordPress API
4. WHEN patient validation completes THEN the system SHALL determine if the contact is a "Lead" or "Member"
5. WHEN patient status is determined THEN the system SHALL create or retrieve an existing conversation session

### Requirement 3: AI Engine WhatsApp Adaptation

**User Story:** As a patient, I want the AI to respond to my WhatsApp messages so that I can receive automated assistance for my healthcare needs.

#### Acceptance Criteria

1. WHEN a patient message is processed THEN the system SHALL route it to the existing Genkit AI engine
2. WHEN the AI generates a response THEN the system SHALL send it via WhatsApp instead of web interface
3. WHEN the AI requests additional information THEN the system SHALL handle text and image inputs from WhatsApp
4. WHEN OCR processing is needed THEN the system SHALL process images sent via WhatsApp
5. WHEN product validation is required THEN the system SHALL query the WordPress API as currently implemented

### Requirement 4: Message Delivery Service

**User Story:** As the system, I want to send messages to patients via WhatsApp so that AI responses and human agent messages reach patients in their preferred channel.

#### Acceptance Criteria

1. WHEN the system needs to send a message THEN it SHALL use WAHA API to deliver content to WhatsApp
2. WHEN sending messages THEN the system SHALL use association-specific WAHA configuration (API URL and key)
3. WHEN message delivery fails THEN the system SHALL log errors and implement retry logic
4. WHEN messages are sent THEN the system SHALL support text, images, and document attachments

### Requirement 5: Human Handoff Workflow

**User Story:** As an AI system, I want to transfer conversations to human agents so that complex cases can be handled appropriately after initial automation.

#### Acceptance Criteria

1. WHEN the AI completes its objective THEN the system SHALL update conversation status to "Awaiting Human Attention"
2. WHEN handoff occurs THEN the system SHALL send a transition message to the patient
3. WHEN conversation status changes THEN the system SHALL stop AI processing for that conversation
4. WHEN handoff is complete THEN the system SHALL notify the CRM interface of pending conversations

### Requirement 6: CRM Inbox Interface

**User Story:** As a human agent, I want to manage WhatsApp conversations through a CRM interface so that I can provide personalized service while maintaining conversation context.

#### Acceptance Criteria

1. WHEN an agent accesses the CRM THEN the system SHALL display an "Inbox" or "Customer Service" section
2. WHEN viewing the inbox THEN the system SHALL list conversations with status "Awaiting Human Attention" or "Active"
3. WHEN an agent selects a conversation THEN the system SHALL display the complete message history
4. WHEN an agent types a message THEN the system SHALL send it to the patient via WhatsApp
5. WHEN conversations are managed THEN the system SHALL update conversation status appropriately
6. WHEN agents send messages THEN the system SHALL maintain conversation threading and context

### Requirement 7: Association Configuration Management

**User Story:** As an association administrator, I want to configure WhatsApp integration settings so that my organization can use its own WhatsApp Business number and WAHA instance.

#### Acceptance Criteria

1. WHEN configuring an association THEN the system SHALL provide fields for WAHA API URL and API key
2. WHEN WAHA configuration is saved THEN the system SHALL validate connectivity to the specified WAHA instance
3. WHEN multiple associations exist THEN the system SHALL route messages to the correct association based on receiving WhatsApp number
4. WHEN configuration changes THEN the system SHALL update routing without affecting active conversations

### Requirement 8: Conversation State Management

**User Story:** As the system, I want to maintain conversation state across WhatsApp interactions so that context is preserved throughout patient interactions.

#### Acceptance Criteria

1. WHEN a patient sends multiple messages THEN the system SHALL maintain conversation continuity
2. WHEN conversations are created THEN the system SHALL store WhatsApp-specific metadata (phone number, WAHA instance)
3. WHEN conversation status changes THEN the system SHALL track transitions between AI and human handling
4. WHEN conversations end THEN the system SHALL archive them with complete interaction history