"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Promise-based replacement for window.confirm():
 *   const confirm = useConfirm();
 *   if (await confirm({ message: "Delete this goal?", danger: true })) { ... }
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    return new Promise<boolean>((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setOptions(next);
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={options !== null}
        onClose={() => settle(false)}
        title={options?.title ?? "Are you sure?"}
      >
        {options ? (
          <div className="flex flex-col gap-4">
            <p className="text-muted">{options.message}</p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => settle(false)}>{options.cancelLabel ?? "Cancel"}</Button>
              <Button
                variant={options.danger ? "danger" : "primary"}
                onClick={() => settle(true)}
                autoFocus
              >
                {options.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}
