import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Simple authentication system for development
// Note: Now using database for persistent sessions

export async function setupSimpleAuth(app: Express) {
  // Check if running on Replit and get user info
  app.get("/api/auth/login", async (req, res) => {
    try {
      console.log('Auth login attempt');
      
      // Get role from query parameter
      const selectedRole = req.query.role as 'customer' | 'merchant';
      if (!selectedRole || !['customer', 'merchant'].includes(selectedRole)) {
        return res.status(400).json({ error: 'Invalid role parameter' });
      }
      
      let userData;
      
      // Try to get Replit user information from headers
      const replitUser = req.headers['x-replit-user-name'];
      const replitUserEmail = req.headers['x-replit-user-email'];
      const replitUserId = req.headers['x-replit-user-id'];
      
      if (replitUser && replitUserId) {
        // Use real Replit user data
        console.log('Using Replit user:', replitUser, 'with role:', selectedRole);
        userData = {
          id: replitUserId as string,
          email: replitUserEmail as string || `${replitUser}@replit.com`,
          firstName: replitUser as string,
          lastName: "User",
          profileImageUrl: `https://replit.com/@${replitUser}/avatar`,
          role: selectedRole,
        };
      } else {
        // Fallback to demo user
        console.log('Using demo user (Replit headers not available) with role:', selectedRole);
        userData = {
          id: "demo-user-123",
          email: "demo@flashdeals.app",
          firstName: "Demo",
          lastName: "User",
          profileImageUrl: "https://replit.com/public/images/mark.png",
          role: selectedRole,
        };
      }

      // Save user to database
      const user = await storage.upsertUser(userData);
      console.log('User created/updated:', user.id);

      // Store in database session
      const sessionToken = `session-${Date.now()}-${Math.random()}`;
      const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days
      
      await storage.createAuthSession({
        token: sessionToken,
        userId: user.id,
        expiresAt: expiresAt
      });

      // Set session cookie with more explicit settings
      const cookieOptions = {
        httpOnly: false, // Allow client-side access for debugging
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'none' as const, // Allow cross-origin cookies
        path: '/',
        domain: undefined // Let browser set automatically
      };
      
      res.cookie('auth_token', sessionToken, cookieOptions);
      console.log('Cookie set with token:', sessionToken, 'and options:', cookieOptions);

      console.log('Session created, redirecting based on role');
      // Send token in URL for client-side storage - use absolute URL to ensure proper redirect
      // Force HTTPS for Replit environment
      const protocol = req.get('host')?.includes('replit.dev') ? 'https' : req.protocol;
      
      // Redirect merchants to Map page, customers to home
      const redirectPath = selectedRole === 'merchant' ? '/map' : '/';
      const redirectUrl = `${protocol}://${req.get('host')}${redirectPath}?auth=success&token=${encodeURIComponent(sessionToken)}`;
      console.log('Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Logout endpoint
  app.get("/api/auth/logout", async (req, res) => {
    const token = req.cookies.auth_token;
    if (token) {
      await storage.deleteAuthSession(token);
    }
    res.clearCookie('auth_token');
    // Clear any session data and redirect to login
    const protocol = req.get('host')?.includes('replit.dev') ? 'https' : req.protocol;
    const redirectUrl = `${protocol}://${req.get('host')}/?logout=success`;
    res.redirect(redirectUrl);
  });

  // Debug endpoint to check available headers
  app.get('/api/debug/headers', (req, res) => {
    console.log('All request headers:', req.headers);
    res.json({
      headers: req.headers,
      replitUser: req.headers['x-replit-user-name'],
      replitEmail: req.headers['x-replit-user-email'],
      replitId: req.headers['x-replit-user-id']
    });
  });

  // User info endpoint
  app.get('/api/auth/user', async (req, res) => {
    console.log('Auth check - cookies received:', req.cookies);
    console.log('Auth check - authorization header:', req.headers.authorization);
    
    // Try to get token from cookie or Authorization header
    let token = req.cookies.auth_token;
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.replace('Bearer ', '');
    }
    
    console.log('Auth token from cookie or header:', token);
    
    if (!token) {
      console.log('No auth token found in cookies or headers');
      return res.status(401).json({ message: "Unauthorized" });
    }

    const session = await storage.getAuthSession(token);
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await storage.deleteAuthSession(token);
      }
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Always fetch fresh user data from database to ensure role updates are reflected
    try {
      const freshUser = await storage.getUser(session.userId);
      if (!freshUser) {
        await storage.deleteAuthSession(token);
        return res.status(401).json({ message: "Unauthorized" });
      }
      res.json(freshUser);
    } catch (error) {
      console.error('Error fetching fresh user data:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Promote user to merchant
  app.post('/api/auth/promote-to-merchant', async (req, res) => {
    let token = req.cookies.auth_token;
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.replace('Bearer ', '');
    }
    
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const session = await storage.getAuthSession(token);
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await storage.deleteAuthSession(token);
      }
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = session.userId;
      const updatedUser = await storage.promoteUserToMerchant(userId);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error promoting user to merchant:", error);
      res.status(500).json({ message: "Failed to promote user to merchant" });
    }
  });
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Try to get token from cookie or Authorization header (same as /api/auth/user)
  let token = req.cookies.auth_token;
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.replace('Bearer ', '');
  }
  
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const session = await storage.getAuthSession(token);
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await storage.deleteAuthSession(token);
    }
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).user = { claims: { sub: session.userId } };
  next();
};