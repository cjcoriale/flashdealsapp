import { useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

export function useAudit() {
  const logAction = useCallback(async (action: string, details: string) => {
    try {
      // In a real app, this would send audit data to the backend
      // For now, we'll just log it to the console and let the middleware handle it
      console.log(`[AUDIT] ${new Date().toISOString()} - ${action}: ${details}`);
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  }, []);

  return { logAction };
}
