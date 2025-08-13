import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    console.log('Discovering OIDC config with:', {
      issuer: process.env.ISSUER_URL ?? "https://replit.com/oidc",
      clientId: process.env.REPL_ID!
    });
    
    const config = await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
    
    console.log('OIDC config discovered successfully');
    return config;
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use PostgreSQL session store for persistent sessions
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true, // Auto-create sessions table
    ttl: sessionTtl / 1000, // TTL in seconds
    tableName: "user_sessions", // Custom table name to avoid conflicts
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: true, // Keep true to allow session creation
    rolling: false, // Don't reset expiration to avoid session recreation
    name: 'flashdeals.session', // Custom session name
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for development
      maxAge: sessionTtl,
      sameSite: 'none', // Allow all cross-site requests for OAuth
      domain: undefined, // Let Express set the domain automatically
      path: '/', // Ensure cookie is available for all paths
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  return await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const claims = tokens.claims();
      console.log('Verifying user with claims:', claims);
      
      // Create user in database first
      const dbUser = await upsertUser(claims);
      console.log('User upserted successfully:', dbUser.id);
      
      // Create session user object
      const user = {
        id: dbUser.id,
        claims: claims
      };
      
      updateUserSession(user, tokens);
      console.log('User session updated, calling verified callback');
      verified(null, user);
    } catch (error) {
      console.error('Error in verify function:', error);
      verified(error, null);
    }
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log('Login request for hostname:', req.hostname);
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', req.session);
    console.log('Available strategies:', Object.keys((passport as any)._strategies));
    console.log('Using strategy:', `replitauth:${req.hostname}`);
    
    const authenticator = passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    });
    
    console.log('Calling passport.authenticate...');
    authenticator(req, res, (err: any) => {
      if (err) {
        console.error('Authentication error in login:', err);
        return res.status(500).json({ error: 'Authentication failed' });
      }
      console.log('Authentication completed - this should not be reached for OAuth redirect');
    });
  });

  app.get("/api/callback", (req, res, next) => {
    console.log('Auth callback received for hostname:', req.hostname);
    console.log('Available auth strategies:', Object.keys((passport as any)._strategies));
    
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any, info: any) => {
      console.log('Passport authenticate callback - err:', err, 'user:', user, 'info:', info);
      
      if (err) {
        console.error('Auth error:', err);
        return res.redirect("/api/login");
      }
      if (!user) {
        console.log('No user found in auth callback');
        return res.redirect("/api/login");
      }
      
      console.log('User authenticated successfully:', user?.claims?.sub);
      req.logIn(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.redirect("/api/login");
        }
        
        console.log('User logged in successfully, redirecting...');
        // Redirect with a query parameter to trigger auth refresh
        const redirectPath = req.session?.returnTo || "/";
        delete req.session?.returnTo;
        
        // Simple redirect to path with auth success parameter
        console.log('Redirecting to:', `${redirectPath}?auth=success`);
        res.redirect(`${redirectPath}?auth=success`);
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};