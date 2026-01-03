// src/ui/app/useAppToast.tsx
"use client";

import * as React from "react";

export type ToastTone = "neutral" | "success" | "danger";

export function useAppToast(durationMs: number = 1600) {
  const [toast, setToast] = React.useState<{
    show: boolean;
    msg: string;
    tone: ToastTone;
  }>({ show: false, msg: "", tone: "neutral" });

  const timerRef = React.useRef<number | null>(null);

  const showToast = React.useCallback(
    (msg: string, tone: ToastTone = "neutral") => {
      setToast({ show: true, msg, tone });

      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setToast((t) => ({ ...t, show: false }));
      }, durationMs);
    },
    [durationMs]
  );

  const hideToast = React.useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast((t) => ({ ...t, show: false }));
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return {
    toastProps: { show: toast.show, message: toast.msg, tone: toast.tone },
    showToast,
    hideToast,
  };
}
