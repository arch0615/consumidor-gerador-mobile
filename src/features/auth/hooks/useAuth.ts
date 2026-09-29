import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import type { RegisterInput } from "@/types/domain";
import { secureStorage, STORAGE_KEYS } from "@/utils/secure-storage";
import { useRegistrationStore } from "../registration.store";

export function useSignIn() {
  const setSignedIn = useAuthStore((state) => state.setSignedIn);
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authService.signIn(email, password),
    onSuccess: async (identity) => {
      await secureStorage.setJson(STORAGE_KEYS.rememberedEmail, identity.email);
      setSignedIn(identity);
    }
  });
}

export function useRegister() {
  const setPending = useRegistrationStore((state) => state.setPending);
  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: (identity) => setPending(identity)
  });
}

/** Activates the session created at sign-up (leaves the auth stack). */
export function useFinishRegistration() {
  const setSignedIn = useAuthStore((state) => state.setSignedIn);
  return () => {
    const { pendingIdentity, clear } = useRegistrationStore.getState();
    if (!pendingIdentity) return false;
    setSignedIn(pendingIdentity);
    clear();
    return true;
  };
}

export function usePasswordReset() {
  return useMutation({ mutationFn: (email: string) => authService.requestPasswordReset(email) });
}

export function useSignOut() {
  const endSession = useAuthStore((state) => state.endSession);
  return useMutation({ mutationFn: () => endSession(null) });
}

/** Last e-mail used to sign in on this device (pre-fills Login). */
export function useRememberedEmail(): { email: string | null; loaded: boolean } {
  const [state, setState] = useState<{ email: string | null; loaded: boolean }>({ email: null, loaded: false });
  useEffect(() => {
    let active = true;
    void secureStorage.getJson(STORAGE_KEYS.rememberedEmail, z.string()).then((email) => {
      if (active) setState({ email, loaded: true });
    });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
