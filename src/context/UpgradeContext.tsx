import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  PropsWithChildren,
  useEffect,
} from "react";

type UpgradeCtx = {
  open: boolean;
  tab: "monthly" | "yearly";
  openModal: (tab?: "monthly" | "yearly") => void;
  closeModal: () => void;
  setTab: (t: "monthly" | "yearly") => void;
};

const Ctx = createContext<UpgradeCtx | null>(null);

export function UpgradeProvider({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"monthly" | "yearly">("monthly");

  const openModal = useCallback((t?: "monthly" | "yearly") => {
    if (t) setTab(t);
    setOpen(true);
  }, []);
  const closeModal = useCallback(() => setOpen(false), []);

  // esc để đóng
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  return (
    <Ctx.Provider value={{ open, tab, openModal, closeModal, setTab }}>
      {children}
    </Ctx.Provider>
  );
}

export const useUpgrade = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUpgrade must be used within <UpgradeProvider>");
  return ctx;
};
