import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Simple authentication system for development
const authenticatedUsers = new Map<string, any>();

export async function setupSimpleAuth(app: Express) {
  // Check if running on Replit and get user info
  app.get("/api/login", async (req, res) => {
    try {
      console.log('Auth login attempt');
      
      let userData;
      
      // Try to get Replit user information from headers
      const replitUser = req.headers['x-replit-user-name'];
      const replitUserEmail = req.headers['x-replit-user-email'];
      const replitUserId = req.headers['x-replit-user-id'];
      
      if (replitUser && replitUserId) {
        // Use real Replit user data
        console.log('Using Replit user:', replitUser);
        userData = {
          id: replitUserId as string,
          email: replitUserEmail as string || `${replitUser}@replit.com`,
          firstName: replitUser as string,
          lastName: "User",
          profileImageUrl: `https://replit.com/@${replitUser}/avatar`,
        };
      } else {
        // Fallback to demo user
        console.log('Using demo user (Replit headers not available)');
        userData = {
          id: "demo-user-123",
          email: "demo@flashdeals.app",
          firstName: "Demo",
          lastName: "User",
          profileImageUrl: "https://replit.com/public/images/mark.png",
        };
      }

      // Save user to database
      const user = await storage.upsertUser(userData);
      console.log('User created/updated:', user.id);

      // Store in memory session
      const sessionToken = `session-${Date.now()}-${Math.random()}`;
      authenticatedUsers.set(sessionToken, {
        user: user,
        expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
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

      console.log('Session created, redirecting to home');
      // Send token in URL for client-side storage - use absolute URL to ensure proper redirect
      const redirectUrl = `${req.protocol}://${req.get('host')}/?auth=success&token=${encodeURIComponent(sessionToken)}`;
      console.log('Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Logout endpoint
  app.get("/api/logout", (req, res) => {
    const token = req.cookies.auth_token;
    if (token) {
      authenticatedUsers.delete(token);
    }
    res.clearCookie('auth_token');
    res.redirect('/');
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

    const session = authenticatedUsers.get(token);
    if (!session || session.expires < Date.now()) {
      authenticatedUsers.delete(token);
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.json(session.user);
  });
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const token = req.cookies.auth_token;
  
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const session = authenticatedUsers.get(token);
  if (!session || session.expires < Date.now()) {
    authenticatedUsers.delete(token);
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).user = { claims: { sub: session.user.id } };
  next();
};