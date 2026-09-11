import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  refresh: () => void;
}

/** Run `fn` on mount and every `intervalMs` (0 = no polling). Also exposes refresh(). */
export function usePolling<T>(fn: () => Promise<T>, intervalMs = 0): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    fnRef
      .current()
      .then((value) => {
        if (cancelled) return;
        setData(value);
        setError(undefined);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = run();
    if (intervalMs <= 0) return cancel;
    const id = setInterval(run, intervalMs);
    return () => {
      cancel();
      clearInterval(id);
    };
  }, [run, intervalMs]);

  return { data, error, loading, refresh: run };
}
