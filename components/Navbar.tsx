"use client";
// @ts-nocheck

import NotificationBell from "./NotificationBell";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ full_name: string; email: string; role: string; profile_picture?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const supabase: any = createClient();

    async function updateAuth(session: any) {
      if (session?.user) {
        setUser(session.user);
        const { data: profileData }: any = await supabase
          .from("profiles")
          .select("full_name, email, role, profile_picture")
          .eq("id", session.user.id)
          .single();
        setProfile(profileData);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }: any) => {
      updateAuth(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      updateAuth(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase: any = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsMenuOpen(false);
    setIsProfileOpen(false);
    router.push("/");
    router.refresh();
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isProfileOpen && !(event.target as Element).closest('.profile-dropdown-container')) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  const dashboardHref =
    profile?.role === "mentor" ? "/mentor/dashboard" : "/student/dashboard";

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-blue-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="text-lg sm:text-xl font-bold text-blue-700">
            ExamCoach
          </Link>
          <div className="hidden sm:flex items-center gap-6">
            {(!user || profile?.role === "student") && (
              <Link href="/browse" className="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors">
                Browse Coaches
              </Link>
            )}
            <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors">
              Contact
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded bg-gray-200" />
          ) : user && profile ? (
            <>
              {/* Desktop Actions */}
              <NotificationBell />

              {/* Profile Dropdown */}
              <div className="relative profile-dropdown-container">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 group p-1 rounded-full hover:bg-gray-50 transition-all"
                >
                  {profile.profile_picture ? (
                    <img
                      src={profile.profile_picture}
                      alt={profile.full_name}
                      className="h-8 w-8 rounded-full object-cover border-2 border-transparent group-hover:border-blue-100"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-transparent group-hover:ring-blue-100">
                      {profile.full_name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="text-gray-400 group-hover:text-gray-600">▼</span>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-gray-50">
                      <p className="text-sm font-black text-gray-900 truncate">{profile.full_name}</p>
                      <p className="text-xs text-gray-400 truncate mb-2">{profile.email}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        profile.role === 'mentor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {profile.role === 'mentor' ? 'Coach' : 'Student'}
                      </span>
                    </div>
                    
                    <div className="py-2">
                      <Link
                        href={profile.role === 'mentor' ? "/mentor/dashboard" : "/student/dashboard"}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        📊 Dashboard
                      </Link>
                      <Link
                        href="/profile/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        👤 My Profile
                      </Link>
                      <Link
                        href="/notifications"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        🔔 Notifications
                      </Link>
                      <button
                        disabled
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-300 cursor-not-allowed rounded-xl"
                      >
                        ⚙️ Settings
                      </button>
                    </div>

                    <div className="pt-2 border-t border-gray-50">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 sm:hidden text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                {isMenuOpen ? "✕" : "☰"}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-bold text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isMenuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white p-4 space-y-2 shadow-2xl animate-in slide-in-from-top-4 duration-300">
           {(!user || profile?.role === "student") && (
             <Link 
              href="/browse" 
              className="block px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl"
              onClick={() => setIsMenuOpen(false)}
            >
              🔍 Browse Coaches
            </Link>
           )}
          <Link 
            href="/contact" 
            className="block px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl"
            onClick={() => setIsMenuOpen(false)}
          >
            ✉️ Contact Support
          </Link>
        </div>
      )}
    </nav>
  );
}

