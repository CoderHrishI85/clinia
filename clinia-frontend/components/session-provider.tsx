"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logout as apiLogout, me, MeResponse, refresh } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

type Session = {
  user: MeResponse["user"] | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // cookie may already be gone
    }
    setUser(null);
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const data = await me();
        if (cancelled) return;
        setUser(data.user);
        if (data.expires_at) {
          const ms = new Date(data.expires_at).getTime() - Date.now() - 60_000;
          if (ms > 0) {
            timerRef.current = setTimeout(async () => {
              try {
                await refresh();
                const next = await me();
                if (!cancelled && next.expires_at) setUser(next.user);
              } catch {
                // session expired; next authenticated call will surface a 401
              }
            }, ms);
          }
        }
      } catch (err) {
        if (!cancelled && err instanceof ApiError && err.status !== 401) {
          // transient backend error: leave as unauthenticated, pages guard themselves
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
