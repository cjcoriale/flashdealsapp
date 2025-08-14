import { useState } from "react";

export function useAuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | undefined>();
  const [forceCustomerLogin, setForceCustomerLogin] = useState(false);

  const openModal = (redirect?: string, forceCustomer = false) => {
    setRedirectAfterAuth(redirect);
    setForceCustomerLogin(forceCustomer);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setRedirectAfterAuth(undefined);
    setForceCustomerLogin(false);
  };

  return {
    isOpen,
    redirectAfterAuth,
    forceCustomerLogin,
    openModal,
    closeModal,
  };
}