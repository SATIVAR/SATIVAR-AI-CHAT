# **App Name**: UtópiZap AI Chat

## Core Features:

- Chat UI: Chat interface mimicking popular messaging apps with conversation bubbles, typing indicators, and timestamps.
- AI Persona: AI persona 'UtópiZap' initialized with a detailed prompt for carisma and efficiency. LLM decides whether or not to employ these in its output.
- Dynamic Components: Dynamic rendering of interactive components (cards, quick replies) based on the LLM response.
- AI Guided Ordering: AI-driven menu presentation that guides the user through categories, suggests upsells/cross-sells using a tool to make these suggestions, and manages an abstract shopping cart via conversation.
- Order Confirmation: Order summary card with all items and total value.  Friendly data gathering to confirm order.
- Optimized Data Flow: Efficient data handling, with menu data cached on the frontend, single write to Firestore for order confirmation, and no Firestore reads during conversation.

## Style Guidelines:

- Primary color: Vibrant blue (#29ABE2) to convey trust and efficiency, complementing the futuristic persona.
- Background color: Light blue (#E5F5FF) to maintain a clean and modern aesthetic, enhancing readability.
- Accent color: Soft teal (#70C7B2) to highlight interactive elements and suggestions.
- Body and headline font: 'PT Sans', a humanist sans-serif.
- Simple, flat icons aligned with a messaging app aesthetic.
- Interface layout mimicking popular messaging apps like WhatsApp.
- Subtle animations for loading states and transitions to enhance user experience.