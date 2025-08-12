# FlashDeals - Local Deals Map Application

## Overview
FlashDeals is a location-based mobile application designed for discovering local flash deals on an interactive map. It enables users to find limited-time discounts from restaurants, shops, and services in their vicinity through a modern, mobile-friendly interface. The project aims to provide a seamless deal discovery experience, connecting users with valuable local offers and supporting local businesses.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components, Radix UI for accessible primitives, Lucide Icons.
- **State Management**: TanStack Query for server state, React hooks for local state.
- **Routing**: Wouter for lightweight client-side routing.
- **Map Integration**: Leaflet with React-Leaflet for interactive maps, utilizing OpenStreetMap for base map tiles.
- **Build Tool**: Vite for development and optimized builds.
- **UI/UX Decisions**: Mobile-first responsive design, consistent navigation patterns for both customer and merchant users, distinct interfaces based on user roles (CustomerHome, MerchantHome). Streamlined map interface, consolidated merchant dashboard.

### Backend
- **Runtime**: Node.js with Express.js.
- **Database**: PostgreSQL with Drizzle ORM.
- **Database Provider**: Neon Database (serverless PostgreSQL).
- **Session Management**: PostgreSQL session store for persistent sessions.
- **API Design**: RESTful endpoints with JSON responses, including role-based authentication endpoints.
- **Core Functionality**: Location-based deal searching, deal claiming, recurring deals system, comprehensive audit logging, merchant portal for deal and business management, role-based authentication (customer vs. merchant).
- **Database Schema**: Includes tables for Users, Merchants, Deals, Audit Logs, Saved Deals, and Deal Claims, with structured fields for business information, deal specifics, and activity tracking.

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