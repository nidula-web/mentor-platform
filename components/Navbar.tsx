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

  // Handle outside click for profile dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isProfileOpen && !event.target.closest('.profile-dropdown-container')) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  return (
    <nav className="sticky top-0 z-40 h-14 w-full bg-white shadow-sm border-b border-gray-100">
      <div className="mx-auto h-full max-w-6xl px-4 flex items-center justify-between">
        {/* Left Section: Hamburger + Logo */}
        <div className="flex items-center gap-2">
          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-blue-700 tracking-tight shrink-0">
            ExamCoach
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 ml-6">
            {(!user || profile?.role === "student") && (
              <>
                <Link href="/browse" className="text-sm font-semibold text-gray-600 hover:text-blue-700 transition-colors">
                  Browse Coaches
                </Link>
                <Link href="/affiliate/dashboard" className="text-sm font-semibold text-green-600 hover:text-green-700 transition-colors">
                  Affiliate
                </Link>
              </>
            )}
            <Link href="/contact" className="text-sm font-semibold text-gray-600 hover:text-blue-700 transition-colors">
              Contact
            </Link>
          </div>
        </div>

        {/* Right Section: Bell + Profile */}
        <div className="flex items-center gap-1 sm:gap-3">
          {user && <NotificationBell />}

          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
          ) : user && profile ? (
            <div className="relative profile-dropdown-container">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center justify-center h-8 w-8 rounded-full border-2 border-blue-50 hover:border-blue-200 transition-all overflow-hidden"
              >
                {profile.profile_picture ? (
                  <img src={profile.profile_picture} alt={profile.full_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">
                    {profile.full_name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="fixed top-14 left-0 right-0 w-full bg-white border-b shadow-xl md:absolute md:top-full md:mt-2 md:right-0 md:w-64 md:rounded-2xl md:border md:shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <div className="p-4 border-b border-gray-50 bg-gray-50/50 md:bg-transparent">
                    <p className="text-sm font-black text-gray-900 truncate">{profile.full_name}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{profile.role === 'mentor' ? 'Coach' : 'Student'}</p>
                  </div>
                  
                  <div className="py-2">
                    <Link
                      href={profile.role === 'mentor' ? "/mentor/dashboard" : "/student/dashboard"}
                      className="flex items-center h-14 px-4 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      📊 Dashboard
                    </Link>
                    <Link
                      href={profile.role === 'mentor' ? "/mentor/profile" : "/student/profile"}
                      className="flex items-center h-14 px-4 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      👤 My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center h-14 w-full px-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      🚪 Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:block text-sm font-bold text-gray-600 hover:text-gray-900 px-3 transition-colors">
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 text-xs sm:text-sm font-black text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar Menu (Left Slide-in) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="fixed top-0 left-0 bottom-0 w-[280px] bg-white shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
            <div className="h-14 px-6 flex items-center justify-between border-b">
              <span className="text-xl font-bold text-blue-700">ExamCoach</span>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {/* Dashboard Link if Logged In */}
              {user && (
                <Link
                  href={profile?.role === 'mentor' ? "/mentor/dashboard" : "/student/dashboard"}
                  className="flex items-center h-14 px-6 text-base font-bold text-gray-900 hover:bg-blue-50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="mr-3">📊</span> Dashboard
                </Link>
              )}

              {(!user || profile?.role === "student") && (
                <>
                  <Link
                    href="/browse"
                    className="flex items-center h-14 px-6 text-base font-bold text-gray-900 hover:bg-blue-50 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="mr-3">🔍</span> Browse Coaches
                  </Link>
                  <Link
                    href="/affiliate/dashboard"
                    className="flex items-center h-14 px-6 text-base font-bold text-green-600 hover:bg-green-50 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="mr-3">🤝</span> Affiliate
                  </Link>
                </>
              )}

              <Link
                href="/contact"
                className="flex items-center h-14 px-6 text-base font-bold text-gray-900 hover:bg-blue-50 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="mr-3">✉️</span> Contact
              </Link>

              <div className="my-4 border-t border-gray-100" />

              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center h-14 w-full px-6 text-base font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <span className="mr-3">🚪</span> Logout
                </button>
              ) : (
                <div className="px-6 space-y-3">
                  <Link
                    href="/login"
                    className="flex items-center justify-center h-12 w-full rounded-xl border-2 font-bold text-gray-700"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="flex items-center justify-center h-12 w-full rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-600/20"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
