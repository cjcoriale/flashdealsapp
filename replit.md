# FlashDeals - Local Deals Map Application

## Overview
FlashDeals is a location-based mobile application designed for discovering local flash deals on an interactive map. It enables users to find limited-time discounts from restaurants, shops, and services in their vicinity through a modern, mobile-friendly interface. The project aims to provide a seamless deal discovery experience, connecting users with valuable local offers and supporting local businesses.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes
- **August 23, 2025**: Fixed Create Deal modal functionality - resolved form validation issues by creating custom schema for form fields and automatically providing required database fields (category, startTime, endTime, discountPercentage) with sensible defaults.
- **August 23, 2025**: Fixed Business Dashboard filtering - updated /api/deals endpoint to accept merchantId parameter and properly filter deals by merchant location instead of showing all deals from all businesses.
- **Core Functionality**: Deal creation modal now works properly with automatic field defaults, Business Dashboard correctly filters deals by selected merchant location.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components, Radix UI for accessible primitives, Lucide Icons.
- **State Management**: TanStack Query for server state, React hooks for local state.
- **Routing**: Wouter for lightweight client-side routing.
- **Map Integration**: Leaflet with React-Leaflet for interactive maps, utilizing OpenStreetMap for base map tiles.
- **Build Tool**: Vite for development and optimized builds.
- **UI/UX Decisions**: Mobile-first responsive design, consistent navigation patterns for both customer and merchant users, distinct interfaces based on user roles (CustomerHome, MerchantHome). Streamlined map interface, consolidated merchant dashboard. Compact, centered deal modals with consolidated information display.

### Backend
- **Runtime**: Node.js with Express.js.
- **Database**: PostgreSQL with Drizzle ORM.
- **Database Provider**: Neon Database (serverless PostgreSQL).
- **Session Management**: PostgreSQL session store for persistent sessions across server restarts.
- **API Design**: RESTful endpoints with JSON responses, including role-based authentication endpoints.
- **Core Functionality**: Location-based deal searching, deal claiming, recurring deals system, comprehensive audit logging, merchant portal for deal and business management, role-based authentication (customer vs. merchant), persistent location storage for merchants across sessions, database-backed application configuration, user preferences system, state management with full persistence, explore mode for non-service areas, and comprehensive role-based permissions preventing merchants from claiming deals.
- **Database Schema**: Comprehensive database persistence including Users, Merchants, Deals, Audit Logs, Saved Deals, Deal Claims, Enabled States, App Settings, User Preferences, and PostgreSQL session storage. All application state and configuration data is stored in the database for consistent cross-session experience. Implemented archival system with soft deletion for both deals (status-based archiving) and merchants (isActive flag) to maintain data integrity while preventing foreign key constraint issues.

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL for production.
- **Drizzle ORM**: Type-safe ORM for PostgreSQL.

### Maps & Location
- **Leaflet**: Open-source mapping library.
- **React-Leaflet**: React components for Leaflet maps.
- **Browser Geolocation API**: For native location services.
- **OpenStreetMap**: Base map tiles for the interactive map.

### UI Framework
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Components built with Radix UI and Tailwind CSS.
- **Lucide Icons**: Icon library.