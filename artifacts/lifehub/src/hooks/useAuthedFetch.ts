import { useAuth } from "@clerk/react";

export function useAuthedFetch() {
  const { getToken } = useAuth();
  return async (path: string, opts?: RequestInit) => {
    const token = await getToken();
    const res = await fetch(path, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
    });
    return res.json();
  };
}
