import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface AuditRequest extends Request {
  auditUserId?: string;
}

export function auditMiddleware(action: string) {
  return async (req: AuditRequest, res: Response, next: NextFunction) => {
    try {
      // Get user ID from auth if available
      const userId = (req as any).user?.claims?.sub || null;
      req.auditUserId = userId;
      
      // Log the action only if we have a valid user or allow anonymous logging
      await storage.createAuditLog({
        userId: userId || null, // Explicitly set to null for anonymous users
        action,
        details: `${req.method} ${req.originalUrl}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || null,
        status: "success"
      });

      next();
    } catch (error) {
      console.error('Audit middleware error:', error);
      // Don't block the request if audit fails
      next();
    }
  };
}

export function auditError(req: AuditRequest, error: Error, action: string) {
  storage.createAuditLog({
    userId: req.auditUserId || null,
    action,
    details: `Error: ${error.message}`,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || null,
    status: "error"
  }).catch(err => {
    console.error('Failed to log audit error:', err);
  });
}