import { useState } from "react";

export function useAuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | undefined>();

  const openModal = (redirect?: string) => {
    setRedirectAfterAuth(redirect);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setRedirectAfterAuth(undefined);
  };

  return {
    isOpen,
    redirectAfterAuth,
    openModal,
    closeModal,
  };
}