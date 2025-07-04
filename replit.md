# FlashDeals - Local Deals Map Application

## Overview

FlashDeals is a location-based deals discovery application that displays local flash deals on an interactive map. Users can discover restaurants, shops, and services offering limited-time discounts in their area through a modern, mobile-friendly interface.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Map Integration**: Leaflet with React-Leaflet for interactive maps
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL session store
- **API Design**: RESTful endpoints with JSON responses

### Data Storage
- **Primary Database**: PostgreSQL hosted on Neon
- **ORM**: Drizzle ORM for type-safe database operations
- **Fallback**: In-memory storage for development/testing
- **Schema**: Structured tables for users, merchants, deals, and audit logs

## Key Components

### Database Schema
1. **Users Table**: User authentication and profile data
2. **Merchants Table**: Business information including location coordinates
3. **Deals Table**: Time-limited offers with pricing and availability
4. **Audit Logs Table**: Comprehensive activity tracking and analytics

### API Endpoints
- `GET /api/deals` - Retrieve all active deals
- `GET /api/deals/location` - Location-based deal search with radius filtering
- `GET /api/deals/:id` - Get specific deal details
- `POST /api/deals/:id/claim` - Claim a deal
- `GET /api/audit/*` - Audit logging and analytics endpoints

### Frontend Components
- **Interactive Map**: Real-time deal markers with location-based filtering
- **Deal Cards**: Scrollable deal display with category filtering
- **Location Services**: GPS integration for user positioning
- **Audit Dashboard**: Administrative analytics and monitoring
- **Mobile-First UI**: Responsive design optimized for mobile devices

## Data Flow

1. **User Location**: Application requests geolocation permissions
2. **Deal Fetching**: Server queries active deals based on location/radius
3. **Map Display**: Deals rendered as interactive markers on map
4. **User Interaction**: Deal selection opens detailed modal
5. **Deal Claiming**: POST request updates deal redemption count
6. **Audit Logging**: All actions logged with user context and metadata

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL for production
- **Connection Pooling**: Built-in connection management
- **Migrations**: Drizzle Kit for schema management

### Maps & Location
- **Leaflet**: Open-source mapping library
- **Browser Geolocation API**: Native location services
- **OpenStreetMap**: Base map tiles

### UI Framework
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Consistent icon library

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Hot module replacement for frontend
- **Node.js Express**: Backend API server
- **Environment Variables**: Database URL and configuration
- **Replit Integration**: Development banner and error overlay

### Production Build
- **Frontend**: Vite build with optimized bundling
- **Backend**: esbuild compilation to single Node.js file
- **Static Assets**: Served from Express with proper caching
- **Database**: Neon serverless PostgreSQL connection

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **NODE_ENV**: Environment detection
- **Session Configuration**: Secure session management
- **CORS**: Cross-origin resource sharing setup

## Changelog

```
Changelog:
- July 04, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```