"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function updateAuth(session: { user: { id: string } } | null) {
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        setRole(profile?.role ?? null);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuth(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateAuth(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    router.push("/");
    router.refresh();
  }

  const dashboardHref =
    role === "mentor" ? "/mentor/dashboard" : "/student/dashboard";

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-blue-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold text-blue-700">
          MentorLK
        </Link>
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded bg-gray-200" />
          ) : user ? (
            <>
              <Link
                href={dashboardHref}
                className="rounded-lg px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
