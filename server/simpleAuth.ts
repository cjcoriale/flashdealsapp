import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Simple authentication system for development
const authenticatedUsers = new Map<string, any>();

export async function setupSimpleAuth(app: Express) {
  // Simple login endpoint that creates a user and session
  app.get("/api/login", async (req, res) => {
    try {
      console.log('Simple auth login attempt');
      
      // Create a demo user for development
      const demoUser = {
        id: "demo-user-123",
        email: "demo@flashdeals.app",
        firstName: "Demo",
        lastName: "User",
        profileImageUrl: "https://replit.com/public/images/mark.png",
      };

      // Save user to database
      const user = await storage.upsertUser(demoUser);
      console.log('Demo user created/updated:', user.id);

      // Store in memory session
      const sessionToken = `session-${Date.now()}-${Math.random()}`;
      authenticatedUsers.set(sessionToken, {
        user: user,
        expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      });

      // Set session cookie
      res.cookie('auth_token', sessionToken, {
        httpOnly: true,
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax'
      });

      console.log('Session created, redirecting to home');
      res.redirect('/?auth=success');
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

  // User info endpoint
  app.get('/api/auth/user', async (req, res) => {
    const token = req.cookies.auth_token;
    
    if (!token) {
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