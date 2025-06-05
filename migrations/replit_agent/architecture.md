# Architecture Documentation

## Overview

This repository contains a Lead Generation Platform application built with a modern tech stack. The application allows users to generate, view, and manage leads across different categories, with tiered subscription plans and a virtual currency system (lead coins) for accessing lead information.

The platform features role-based access control with three main user types:
- Administrators: Full system access
- Subadmins: Role-based access to specific modules
- Regular users: Access to leads based on subscriptions and lead coins

## System Architecture

The application follows a client-server architecture with a clear separation between frontend and backend components:

### Frontend Architecture

- **Technology**: React with TypeScript
- **Component Structure**: Follows a feature-based organization with shared UI components
- **State Management**: Uses React Query for server state management
- **UI Framework**: Custom components built with Radix UI primitives and styled with Tailwind CSS
- **Routing**: Uses Wouter for lightweight client-side routing

### Backend Architecture

- **Technology**: Express.js (Node.js) with TypeScript
- **API Structure**: RESTful API with modular route handlers
- **Database Access**: Uses Drizzle ORM with PostgreSQL (via Neon Serverless)
- **Authentication**: Session-based authentication with express-session
- **Email Services**: Integrated email functionality for user verification and notifications

### Data Storage

- **Primary Database**: PostgreSQL (via Neon Serverless)
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Database schema defined in TypeScript with Drizzle schema builders
- **Data Validation**: Zod for schema validation throughout the application

## Key Components

### User Authentication & Authorization

- **Session Management**: Uses express-session with MemoryStore
- **Password Security**: Uses bcrypt for password hashing
- **Email Verification**: OTP-based email verification flow
- **Password Reset**: Token-based password reset functionality
- **Role-Based Access**: Granular permissions for admin, subadmin, and regular users

### Lead Management

- **Categories**: Leads organized by categories with CRUD operations
- **Access Control**: Tiered access to lead details based on user subscription and lead coins
- **Search & Filter**: Functionality to search and filter leads by various criteria

### Subscription System

- **Subscription Plans**: Different pricing tiers with various benefits
- **Payment Integration**: Stripe integration for handling subscription payments
- **Plan Management**: Admin tools for creating and managing subscription plans

### Lead Coin Economy

- **Virtual Currency**: Lead coins as an in-app currency for accessing lead information
- **Pricing Tiers**: Different costs for accessing various levels of lead information
- **Admin Controls**: Settings to manage lead coin allocation and pricing

### Support System

- **Tickets**: User-initiated support tickets with threaded replies
- **Status Tracking**: Workflow states for ticket resolution
- **Admin Interface**: Tools for managing and responding to support tickets

## Data Flow

1. **Authentication Flow**:
   - User registers → Email verification → Login → Session established
   - Password reset flow: Request reset → Email token → Set new password

2. **Lead Acquisition Flow**:
   - User browses lead categories → Selects lead → Views preview
   - User spends lead coins or has subscription → Accesses detailed information

3. **Subscription Flow**:
   - User selects plan → Payment processing → Subscription activated
   - Admin approves subscription → User gains access to premium features

4. **Support Flow**:
   - User creates ticket → Admin/Subadmin responds → User replies → Resolution

## Database Schema

The application uses a relational database with the following core entities:

1. **Users**: Stores user information, authentication details, and role information
2. **Lead Categories**: Categorization system for leads
3. **Leads**: Core lead information with various detail levels
4. **Subscriptions**: Available subscription plans
5. **User Subscriptions**: Tracks user subscriptions and their status
6. **Viewed Leads**: Records which leads have been viewed by users
7. **Support Tickets**: User support requests with threaded replies
8. **Lead Coin Settings**: Configuration for the lead coin economy

Relationships between these entities are established using foreign keys and Drizzle ORM relation definitions.

## External Dependencies

### Core Libraries

- **React**: Frontend UI library
- **Express**: Backend web framework
- **Drizzle ORM**: Database ORM
- **Zod**: Schema validation
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible UI component primitives
- **React Query**: Data fetching and caching

### External Services

- **Neon Serverless**: PostgreSQL database provider
- **Stripe**: Payment processing
- **SendGrid**: Email delivery service (via @sendgrid/mail)
- **SMTP Services**: Email delivery via nodemailer

## Build & Deployment

### Development Environment

- **Vite**: Frontend build tool and development server
- **TypeScript**: Type checking and transpilation
- **ESBuild**: Fast bundling for server code

### Deployment Strategy

- **Build Process**: 
  - Frontend: Vite builds static assets
  - Backend: ESBuild bundles server code
  - Combined into a single distribution package

- **Deployment Target**: 
  - Configured for autoscaled deployment
  - Port mapping from 5000 (local) to 80 (external)

### Development Workflow

- **npm run dev**: Runs development server
- **npm run build**: Builds production assets
- **npm run start**: Starts production server
- **npm run check**: TypeScript type checking
- **npm run db:push**: Updates database schema

## Security Considerations

- **Authentication**: Secure session management and password hashing
- **Authorization**: Role-based access control with granular permissions
- **Input Validation**: Zod schema validation for all user inputs
- **API Security**: Proper error handling and status codes
- **Database Security**: Type-safe ORM with parameterized queries

## Frontend Architecture Details

### Component Structure

- **Layout Components**: Provide consistent page structure (MainLayout)
- **UI Components**: Reusable UI elements (Button, Card, etc.)
- **Feature Components**: Functionality-specific components (LeadCard, TicketForm, etc.)
- **Page Components**: Correspond to routes in the application

### Theme & Styling

- **Theming**: Supports light and dark mode via CSS variables
- **Styling**: Tailwind CSS with custom configuration
- **Component Library**: Custom components following a design system pattern

## Backend Architecture Details

### API Structure

- **/api/auth**: Authentication endpoints (login, register, verify, etc.)
- **/api/leads**: Lead management endpoints
- **/api/subscriptions**: Subscription management
- **/api/support**: Support ticket system
- **/api/users**: User management for admins
- **/api/subadmins**: Subadmin management

### Middleware

- **Session**: Authentication and session management
- **Error Handling**: Centralized error handling
- **Logging**: Request logging for API endpoints

## Scaling Considerations

- **Database**: Uses Neon Serverless PostgreSQL for scalable database access
- **Stateless Backend**: Supports horizontal scaling
- **Frontend**: Static assets can be distributed via CDN
- **Memory Usage**: Session store might need to be replaced for production scaling

## Future Architecture Considerations

- **Caching**: Implement Redis for caching frequently accessed data
- **Background Jobs**: Add a job queue for handling asynchronous tasks
- **Microservices**: Consider splitting into microservices as features expand
- **Containerization**: Docker containerization for consistent deployments