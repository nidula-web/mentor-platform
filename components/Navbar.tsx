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

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMenuOpen]);

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
          {/* Notifications - Visible always if logged in */}
          {user && <NotificationBell />}

          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          ) : user && profile ? (
            <>
              {/* Profile Dropdown (Desktop) */}
              <div className="hidden sm:block relative profile-dropdown-container">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 group p-1 rounded-full hover:bg-gray-50 transition-all touch-target"
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
                        className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        📊 Dashboard
                      </Link>
                      <Link
                        href="/profile/settings"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        👤 My Profile
                      </Link>
                      <Link
                        href="/notifications"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        🔔 Notifications
                      </Link>
                    </div>

                    <div className="pt-2 border-t border-gray-50">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
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
                className="p-2 sm:hidden text-gray-900 hover:bg-gray-100 rounded-xl touch-target flex items-center justify-center"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 sm:px-4 py-2 text-sm font-bold text-gray-900 hover:bg-gray-50 rounded-xl transition-all touch-target flex items-center justify-center invisible sm:visible"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 touch-target flex items-center justify-center"
              >
                Sign Up
              </Link>
              {/* Mobile Menu Toggle for Guest */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 sm:hidden text-gray-900 hover:bg-gray-100 rounded-xl touch-target flex items-center justify-center"
                aria-label="Toggle menu"
              >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      <div 
        className={`fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 sm:hidden ${
          isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Side Mobile Menu Drawer */}
      <div className={`fixed right-0 top-0 bottom-0 z-[70] w-72 sm:w-80 bg-white shadow-2xl transition-transform duration-300 ease-out transform sm:hidden ${
        isMenuOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex h-16 items-center justify-between px-6 border-b border-slate-50">
            <Link href="/" className="text-xl font-bold text-blue-700" onClick={() => setIsMenuOpen(false)}>
              ExamCoach
            </Link>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
            {user && profile ? (
              <div className="mb-8 p-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl shadow-lg shadow-blue-600/20 text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-5">
                    {profile.profile_picture ? (
                      <img src={profile.profile_picture} alt={profile.full_name} className="h-14 w-14 rounded-full object-cover ring-2 ring-white/20" />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-xl font-black">
                        {profile.full_name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-black truncate text-base leading-tight">{profile.full_name}</p>
                      <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest opacity-80">{profile.role === 'mentor' ? 'Coach' : 'Student Account'}</p>
                    </div>
                  </div>
                  
                  <Link
                    href={profile.role === 'mentor' ? "/mentor/dashboard" : "/student/dashboard"}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-white text-blue-700 font-black text-sm rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    📊 Open Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-8">
                <Link
                  href="/signup"
                  className="flex items-center justify-center w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Join ExamCoach
                </Link>
                <Link
                  href="/login"
                  className="flex items-center justify-center w-full py-4 text-slate-700 font-black border-2 border-slate-100 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
              </div>
            )}

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-3 mb-3">Main Menu</p>
              <div className="grid gap-1">
                <Link 
                  href="/" 
                  className="flex items-center gap-4 px-4 py-4 text-base font-bold text-slate-900 hover:bg-blue-50 hover:text-blue-700 rounded-2xl transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="text-xl opacity-60">🏠</span> Home
                </Link>
                {(!user || profile?.role === "student") && (
                  <Link 
                    href="/browse" 
                    className="flex items-center gap-4 px-4 py-4 text-base font-bold text-slate-900 hover:bg-blue-50 hover:text-blue-700 rounded-2xl transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="text-xl opacity-60">🔎</span> Find a Coach
                  </Link>
                )}
                <Link 
                  href="/contact" 
                  className="flex items-center gap-4 px-4 py-4 text-base font-bold text-slate-900 hover:bg-blue-50 hover:text-blue-700 rounded-2xl transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="text-xl opacity-60">✉️</span> Contact Support
                </Link>
              </div>
            </div>

            {user && (
              <div className="pt-8 border-t border-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-3 mb-3">Settings</p>
                <div className="grid gap-1">
                  <Link 
                    href="/profile/settings" 
                    className="flex items-center gap-4 px-4 py-4 text-base font-bold text-slate-900 hover:bg-blue-50 hover:text-blue-700 rounded-2xl transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="text-xl opacity-60">👤</span> Account Settings
                  </Link>
                  <Link 
                    href="/notifications" 
                    className="flex items-center gap-4 px-4 py-4 text-base font-bold text-slate-900 hover:bg-blue-50 hover:text-blue-700 rounded-2xl transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="text-xl opacity-60">🔔</span> Notifications
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 w-full px-4 py-4 text-base font-bold text-red-600 hover:bg-red-50 rounded-2xl transition-colors text-left"
                  >
                    <span className="text-xl opacity-60">🚪</span> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

