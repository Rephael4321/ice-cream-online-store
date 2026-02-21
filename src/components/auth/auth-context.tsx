"use client";

import { createContext, useContext } from "react";

export type AuthContextValue = {
  role: string | null;
};

const AuthContext = createContext<AuthContextValue>({ role: null });

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export { AuthContext };
