import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { User } from "@shared/schema";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, refetch } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0, // Always check for fresh auth state
  });

  // Listen for auth state changes (e.g., after login redirect)
  useEffect(() => {
    // Check if we just returned from authentication
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      // Remove the auth parameter and refetch user data
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('auth');
      window.history.replaceState({}, '', newUrl.pathname);
      refetch();
    }

    const handleFocus = () => {
      // Refetch auth state when window regains focus (after auth redirect)
      refetch();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetch]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch,
  };
}