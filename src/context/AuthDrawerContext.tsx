import React, { createContext, useContext, useState, ReactNode } from "react";

type AuthMode = "signin" | "signup" | null;

type Ctx = {
  open: boolean;
  mode: AuthMode;
  openWith: (m: Exclude<AuthMode, null>) => void;
  close: () => void;
  switchMode: (m: Exclude<AuthMode, null>) => void;
};

const AuthDrawerCtx = createContext<Ctx | null>(null);

export const useAuthDrawer = () => {
  const ctx = useContext(AuthDrawerCtx);
  if (!ctx)
    throw new Error("useAuthDrawer must be used inside AuthDrawerProvider");
  return ctx;
};

export function AuthDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>(null);

  const openWith = (m: Exclude<AuthMode, null>) => {
    setMode(m);
    setOpen(true);
    // khóa scroll nền
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    setOpen(false);
    setTimeout(() => setMode(null), 300);
    document.body.style.overflow = "";
  };

  const switchMode = (m: Exclude<AuthMode, null>) => setMode(m);

  return (
    <AuthDrawerCtx.Provider value={{ open, mode, openWith, close, switchMode }}>
      {children}
    </AuthDrawerCtx.Provider>
  );
}
