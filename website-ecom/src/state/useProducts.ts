import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { Product } from "../api/types";

type LoadState<T> = { status: "loading" } | { status: "error"; error: unknown } | { status: "ready"; data: T };

let cache: Product[] | null = null;
let inflight: Promise<Product[]> | null = null;

function fetchProducts(): Promise<Product[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = api
      .listProducts()
      .then((p) => {
        cache = p;
        return p;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useProducts(): LoadState<Product[]> & { retry: () => void } {
  const [state, setState] = useState<LoadState<Product[]>>(cache ? { status: "ready", data: cache } : { status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    if (attempt > 0) setState({ status: "loading" });
    fetchProducts().then(
      (data) => alive && setState({ status: "ready", data }),
      (error: unknown) => alive && setState({ status: "error", error }),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { ...state, retry };
}

export function useProduct(handle: string | undefined): LoadState<Product> & { retry: () => void } {
  const cached = cache?.find((p) => p.handle === handle);
  const [state, setState] = useState<LoadState<Product>>(cached ? { status: "ready", data: cached } : { status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!handle) return;
    let alive = true;
    const hit = cache?.find((p) => p.handle === handle);
    if (hit) setState({ status: "ready", data: hit });
    else setState({ status: "loading" });
    api.getProduct(handle).then(
      (data) => alive && setState({ status: "ready", data }),
      (error: unknown) => alive && !hit && setState({ status: "error", error }),
    );
    return () => {
      alive = false;
    };
  }, [handle, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { ...state, retry };
}
