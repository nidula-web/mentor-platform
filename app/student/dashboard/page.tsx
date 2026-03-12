"use client";
// @ts-nocheck

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Subscription, Mentor, Profile } from "@/lib/supabase";
import StudentGuide from "@/components/StudentGuide";

type SubWithMentor = Subscription & {
  mentor: Mentor | null;
  mentor_profile: Pick<Profile, "full_name" | "profile_picture"> | null;
  has_review: boolean;
};

function DefaultAvatar({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-blue-100 text-blue-600 ${className}`}
    >
      <svg className="h-1/2 w-1/2" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

function daysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const exp = new Date(expiresAt);
  const diff = exp.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState<string>("");
  const [subscriptions, setSubscriptions] = useState<SubWithMentor[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase: any = createClient();
      const { data: { user } }: any = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile }: any = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setStudentName(profile?.full_name ?? "Student");

      const { data: subsData, error: subsError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("student_id", user.id);

      if (subsError || !subsData?.length) {
        setSubscriptions([]);
        setLoading(false);
        return;
      }

      const mentorIds = [...new Set(subsData.map((s: any) => s.mentor_id))];
      const { data: mentorsData }: any = await supabase
        .from("mentors")
        .select("*")
        .in("id", mentorIds);
      const mentorMap = new Map((mentorsData ?? []).map((m: any) => [m.id, m]));
      const mentorUserIds = (mentorsData ?? []).map((m: any) => m.user_id);
      const { data: profilesData }: any = await supabase
        .from("profiles")
        .select("id, full_name, profile_picture")
        .in("id", mentorUserIds);
      const profileMap = new Map(
        (profilesData ?? []).map((p: any) => [
          p.id,
          { full_name: p.full_name, profile_picture: p.profile_picture },
        ])
      );

      const { data: reviewsData }: any = await supabase
        .from("reviews")
        .select("subscription_id")
        .eq("student_id", user.id);
      const reviewedSubIds = new Set(
        (reviewsData ?? []).map((r: any) => r.subscription_id)
      );

      const mentorIdToUserId = new Map(
        (mentorsData ?? []).map((m: any) => [m.id, m.user_id])
      );

      const withMentors: SubWithMentor[] = [];
      const now = new Date();

      for (const s of (subsData ?? [])) {
        const mentor = (mentorMap.get(s.mentor_id) as Mentor) ?? null;
        const mentorProfile = mentor
          ? profileMap.get((mentor as any).user_id) ?? null
          : null;
        
        let currentStatus = s.status;

        // Auto-expiry check
        if (s.status === "active" && s.expires_at && new Date(s.expires_at) < now) {
          currentStatus = "expired";
          
          // Update database
          await supabase
            .from("subscriptions")
            .update({ status: "expired" })
            .eq("id", s.id);
          
          // Decrement mentor student count
          if (mentor) {
            await supabase
              .from("mentors")
              .update({ current_student_count: Math.max(0, (mentor.current_student_count || 1) - 1) })
              .eq("id", s.id);
          }
        }

        withMentors.push({
          ...s,
          status: currentStatus,
          mentor,
          mentor_profile: mentorProfile,
          has_review: reviewedSubIds.has(s.id),
        });
      }

      setSubscriptions(withMentors);
      setLoading(false);
    }
    load();

    // Check if guide should be shown
    const guideShown = localStorage.getItem("student_guide_shown");
    if (!guideShown) {
      setShowGuide(true);
    }
  }, [router]);

  const handleCloseGuide = () => {
    localStorage.setItem("student_guide_shown", "true");
    setShowGuide(false);
  };

  const handleShowGuideAgain = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowGuide(true);
  };

  const now = new Date();
  const activeSubs = subscriptions.filter(
    (s) =>
      s.status === "active" &&
      s.expires_at &&
      new Date(s.expires_at) > now
  );
  const pastSubs = subscriptions.filter(
    (s) =>
      s.status === "expired" ||
      s.status === "cancelled" ||
      (s.expires_at && new Date(s.expires_at) <= now)
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="mx-auto max-w-5xl px-4 py-8 pt-24 sm:px-6">
        <h1 className="mb-8 text-2xl font-bold text-gray-900 sm:text-3xl">
          Welcome, {studentName}
        </h1>

        {/* Active Subscriptions */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Active Subscriptions
          </h2>

          {activeSubs.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-gray-600">You don&apos;t have an exam coach yet</p>
              <Link
                href="/browse"
                className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                Find Your Exam Coach
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {activeSubs.map((sub) => {
                const remaining = daysRemaining(sub.expires_at) ?? 0;
                const daysUsed = Math.max(0, 30 - remaining);
                const progressPercent = Math.min(100, (daysUsed / 30) * 100);

                return (
                  <div
                    key={sub.id}
                    className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
                        {sub.mentor_profile?.profile_picture ? (
                          <img
                            src={sub.mentor_profile.profile_picture}
                            alt=""
                            className="h-14 w-14 object-cover"
                          />
                        ) : (
                          <DefaultAvatar className="h-14 w-14" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {sub.mentor_profile?.full_name ?? "Coach"}
                        </h3>
                        {sub.mentor?.university && (
                          <p className="text-sm text-gray-600">
                            {sub.mentor.university}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 text-sm font-medium text-gray-700">
                      Days remaining: {remaining}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {daysUsed} of 30 days used
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href={`/chat/${sub.id}`}
                        className="flex-1 sm:flex-none h-[44px] flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2 text-sm font-black text-white hover:bg-blue-700 active:scale-95 transition-all"
                      >
                        Open Chat
                      </Link>
                      {!sub.has_review && (
                        <Link
                          href={`/review/${sub.id}`}
                          className="flex-1 sm:flex-none h-[44px] flex items-center justify-center rounded-lg bg-gray-800 px-6 py-2 text-sm font-black text-white hover:bg-gray-900 active:scale-95 transition-all"
                        >
                          Leave Review
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Past Subscriptions */}
        {pastSubs.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Past Subscriptions
            </h2>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <ul className="divide-y divide-gray-200">
                {pastSubs.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-6 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                        {sub.mentor_profile?.profile_picture ? (
                          <img
                            src={sub.mentor_profile.profile_picture}
                            alt=""
                            className="h-10 w-10 object-cover"
                          />
                        ) : (
                          <DefaultAvatar className="h-10 w-10" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {sub.mentor_profile?.full_name ?? "Coach"}
                          {sub.status === "expired" && (
                            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">EXPIRED</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {sub.mentor?.university}
                          {sub.expires_at &&
                            ` • Ended ${new Date(sub.expires_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                      {sub.status === "expired" && (
                        <Link
                          href={`/subscribe/${sub.mentor_id}`}
                          className="flex-1 sm:flex-none h-[40px] flex items-center justify-center text-center rounded-lg bg-blue-600 px-6 py-2 text-sm font-black text-white hover:bg-blue-700 active:scale-95 transition-all"
                        >
                          Renew
                        </Link>
                      )}
                      {!sub.has_review && (
                        <Link
                          href={`/review/${sub.id}`}
                          className="flex-1 sm:flex-none h-[40px] flex items-center justify-center text-center rounded-lg bg-gray-800 px-6 py-2 text-sm font-black text-white hover:bg-gray-900 active:scale-95 transition-all"
                        >
                          Review
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <div className="border-t border-gray-200 pt-8 text-center">
          <button 
            onClick={handleShowGuideAgain}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            📖 View Instructions Again
          </button>
        </div>
      </footer>

      {showGuide && <StudentGuide onClose={handleCloseGuide} />}
    </div>
  );
}

