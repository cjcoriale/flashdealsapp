import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface AuditRequest extends Request {
  auditUserId?: string;
}

export function auditMiddleware(action: string) {
  return async (req: AuditRequest, res: Response, next: NextFunction) => {
    try {
      const details = JSON.stringify({
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params
      });

      await storage.createAuditLog({
        userId: req.auditUserId || 'anonymous',
        action,
        details,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        status: 'success'
      });

      next();
    } catch (error) {
      console.error('Audit logging failed:', error);
      next();
    }
  };
}

export function auditError(req: AuditRequest, error: Error, action: string) {
  storage.createAuditLog({
    userId: req.auditUserId || 'anonymous',
    action,
    details: error.message,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || '',
    status: 'error'
  }).catch(console.error);
}
