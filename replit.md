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
- July 06, 2025 07:24: PREVIOUS DEALS & REPOST FUNCTIONALITY COMPLETE - Real expired deals management
  * REPLACED: "Deals Selected for Location" section with "Previous Deals" showing only authentic expired deals
  * IMPLEMENTED: Database endpoint for expired deals filtered by merchant ownership
  * ADDED: Repost functionality allowing merchants to reactivate expired deals with 24-hour duration
  * ENHANCED: UI displays expired deals with "Repost Deal" buttons for easy deal management
  * VERIFIED: Real data integration - no mock cards, only genuine previous deals from merchant's businesses
  * TESTED: API endpoints working correctly - expired deals fetch and repost creation both functional
  * RESULT: Merchants can now view their past deals and quickly repost them to market again
- July 05, 2025 03:08: BUSINESS CREATION ENFORCEMENT COMPLETE - User-friendly automated flow
  * FIXED: Business creation form now automatically appears when merchants have no businesses
  * ENHANCED: Changed title from "Business Profile Required" to "Create a Business to Get Started"
  * IMPROVED: Form appears prominently at top of Create Deal page with welcoming messaging
  * STREAMLINED: Automatic detection prevents merchants from accessing deal creation without business
  * ADDED: Image URL field to business creation form with proper validation
  * UPDATED: Database schema includes imageUrl column for business photos
  * RESULT: Seamless onboarding flow guides new merchants through business setup before deal creation

- July 05, 2025 02:34: MERCHANT INTERFACE CONSOLIDATION COMPLETE - Clean streamlined dashboard
  * FIXED: JavaScript ReferenceError for undefined user variable in merchant dashboard header
  * IMPLEMENTED: Profile image display on left side of dashboard title with logout button on right
  * REMOVED: Profile tab from merchant bottom navigation (consolidated into dashboard)
  * STREAMLINED: Merchant navigation now has clean 2-tab layout (Create Deal, Map)
  * ENHANCED: Header layout with profile image left of title and prominent logout button on right
  * CONFIGURED: Home URL (/) now shows Map page for all users - primary app interface is map view
  * UPDATED: Navigation restructured - Map at home URL, Deals content moved to /deals route
  * UNIFIED: Both merchants and customers land on Map page after login for immediate deal discovery
  * VERIFIED: Logout functionality properly clears session and returns to login screen
  * RESULT: All merchant functionality consolidated into dashboard with integrated profile display

- July 05, 2025 01:03: ROLE-BASED AUTHENTICATION SYSTEM COMPLETE - Major architectural upgrade successful
  * IMPLEMENTED: Role selection modal during login (customer vs merchant choice)
  * FIXED: Authentication endpoints now properly handle role parameters (/api/auth/login?role=customer)
  * CREATED: Separate home pages - CustomerHome for discovery, MerchantHome for business dashboard
  * UPDATED: Router with conditional role-based navigation and page access control
  * ENHANCED: Bottom navigation now shows different options based on user role
  * RESULT: Complete role-based user experience with targeted interfaces for each user type
  * VERIFIED: Authentication flow routes users to appropriate interfaces based on selected role

- July 05, 2025 00:35: MERCHANT AUTHENTICATION FULLY RESOLVED - Complete system overhaul successful
  * FIXED: Persistent database sessions replacing memory-based storage (sessions survive server restarts)
  * FIXED: React Query cache invalidation when new auth tokens received (eliminates stale state)
  * FIXED: Authentication endpoint fetches fresh user data ensuring role updates reflect immediately
  * FIXED: Bottom navigation z-index increased to prevent overlay issues
  * CONFIRMED: User successfully promoted to merchant status with working portal access
  * RESULT: Profile page correctly displays merchant badge and dashboard interface

- July 04, 2025 22:20: UI CLEANUP & NAVIGATION IMPROVEMENTS - Clean map interface with focused profile page
  * Removed hamburger menu button from map page for streamlined interface
  * Kept search functionality while eliminating navigation clutter on map
  * Enhanced profile page with beautiful merchant dashboard section
  * Simplified stats display to focus on saved and claimed deals
  * Added gradient styling to merchant portal section for better visual hierarchy
  * User successfully promoted to merchant status and portal accessible via profile
  * Map page now pure focus on deals discovery without navigation distractions

- July 04, 2025 22:07: MERCHANT SYSTEM COMPLETE - Role-based access control fully operational
  * Direct user promotion to merchant status working via API endpoint
  * Merchant Portal now shows different interfaces based on user role
  * Regular users see "Become a Merchant" promotion interface
  * Merchants see full business and deal management dashboard
  * Role checking integrated throughout application
  * User successfully promoted to merchant status for testing

- July 04, 2025 21:05: AUTHENTICATION BREAKTHROUGH - Token-based auth system fully operational
  * RESOLVED: Fixed critical protocol mismatch (HTTP vs HTTPS) causing authentication failures
  * Token extraction and storage working perfectly across browser sessions
  * Authorization headers properly attached to API requests
  * User authentication state correctly maintained throughout app
  * All protected endpoints now accessible to authenticated users
  * Login modal and redirect flow working seamlessly
  * Authentication system ready for production deployment

- July 04, 2025 19:20: MAJOR EXPANSION - Authentication system and comprehensive features
  * Implemented Replit-based authentication system for secure user access
  * Migrated from in-memory storage to full PostgreSQL database with Drizzle ORM
  * Added user authentication with landing page for logged-out users
  * Created comprehensive database schema: users, merchants, deals, saved deals, deal claims, audit logs
  * Built 6 new pages: Home dashboard, Deals list, Saved deals, Analytics, Merchant dashboard, Landing
  * Implemented merchant portal for businesses to create and manage deals
  * Added deal saving/bookmarking and claiming functionality for users
  * Enhanced audit logging system with comprehensive activity tracking
  * Sample data populated: 5 merchants and 7 deals across NYC locations
  * Authentication routes: /api/login, /api/logout, /api/callback for seamless user experience

- July 04, 2025 19:07: MAJOR MILESTONE - Fixed critical modal bug, app fully functional
  * Resolved React state closure issue preventing modal from closing
  * Implemented useCallback for stable function references
  * Modal now supports multiple close methods (X button, handle bar, background click)
  * Comprehensive audit logging operational
  * All core features working: deal discovery, map interaction, modal details
  * App ready for production deployment

- July 04, 2025: Initial setup and core development
  * Built interactive map with deal markers
  * Implemented comprehensive audit logging system
  * Created mobile-first responsive design
  * Integrated real-time deal tracking
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```