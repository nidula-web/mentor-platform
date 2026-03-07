"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Subscription, Mentor, Profile } from "@/lib/supabase";

type SubWithStudent = Subscription & {
  student_name: string | null;
  last_message: string | null;
  last_message_type: string | null;
  unread_count: number;
};

type ReviewWithStudent = {
  id: string;
  subscription_id: string;
  rating: number;
  comment: string | null;
  created_at?: string;
  student_name: string | null;
};

function daysRemaining(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  const now = new Date();
  const exp = new Date(expiresAt);
  const diff = exp.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export default function MentorDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mentorName, setMentorName] = useState<string>("");
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [activeSubs, setActiveSubs] = useState<SubWithStudent[]>([]);
  const [reviews, setReviews] = useState<ReviewWithStudent[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setMentorName(profile?.full_name ?? "Mentor");

      const { data: mentor, error: mentorError } = await supabase
        .from("mentors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (mentorError || !mentor) {
        setLoading(false);
        return;
      }
      setMentorId(mentor.id);

      const now = new Date().toISOString();
      const { data: subsData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("mentor_id", mentor.id)
        .eq("status", "active")
        .gt("expires_at", now);

      if (!subsData?.length) {
        setActiveSubs([]);
      } else {
        const studentIds = subsData.map((s) => s.student_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds);
        const profileMap = new Map(
          (profilesData ?? []).map((p) => [p.id, p.full_name])
        );

        const subIds = subsData.map((s) => s.id);
        const { data: messagesData } = await supabase
          .from("messages")
          .select("id, subscription_id, sender_id, content, message_type, is_read")
          .in("subscription_id", subIds)
          .order("created_at", { ascending: false });

        const lastBySub = new Map<string, { content: string; message_type: string }>();
        const unreadBySub = new Map<string, number>();
        (messagesData ?? []).forEach((m) => {
          if (!lastBySub.has(m.subscription_id)) {
            lastBySub.set(m.subscription_id, {
              content: m.message_type === "image" ? "📷 Photo" : (m.content || "").slice(0, 50),
              message_type: m.message_type,
            });
          }
          if (!m.is_read && m.sender_id !== user.id) {
            unreadBySub.set(
              m.subscription_id,
              (unreadBySub.get(m.subscription_id) ?? 0) + 1
            );
          }
        });

        const withStudents: SubWithStudent[] = subsData.map((s) => {
          const last = lastBySub.get(s.id);
          return {
            ...s,
            student_name: profileMap.get(s.student_id) ?? null,
            last_message: last?.content ?? null,
            last_message_type: last?.message_type ?? null,
            unread_count: unreadBySub.get(s.id) ?? 0,
          };
        });
        setActiveSubs(withStudents);
      }

      const { data: allReviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("mentor_id", mentor.id);
      if (allReviews?.length) {
        const total = allReviews.reduce((sum, r) => sum + r.rating, 0);
        setAvgRating(Math.round((total / allReviews.length) * 10) / 10);
      }

      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("id, subscription_id, student_id, rating, comment")
        .eq("mentor_id", mentor.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (reviewsData?.length) {
        const studentIds = [...new Set(reviewsData.map((r) => r.student_id))];
        const { data: revProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds);
        const revProfileMap = new Map(
          (revProfiles ?? []).map((p) => [p.id, p.full_name])
        );
        setReviews(
          reviewsData.map((r) => ({
            ...r,
            student_name: revProfileMap.get(r.student_id) ?? null,
          }))
        );
      } else {
        setReviews([]);
      }

      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!mentorId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">
            Mentor profile not found
          </h1>
          <Link href="/mentor/setup" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Complete setup
          </Link>
        </div>
      </div>
    );
  }

  const totalEarned = activeSubs.length * 1000;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-xl font-bold text-blue-700">
            MentorLK
          </Link>
          <Link
            href="/browse"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Browse mentors
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">
          Welcome, {mentorName}
        </h1>

        {/* Stats */}
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Active Students</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {activeSubs.length}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total Earned</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              Rs. {totalEarned.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Your Rating</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {avgRating != null ? `${avgRating}/5` : "—"}
            </p>
          </div>
        </div>

        {/* Active Students */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Active Students
          </h2>
          {activeSubs.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
              No active students yet
            </div>
          ) : (
            <div className="space-y-4">
              {activeSubs.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">
                        {sub.student_name ?? "Student"}
                      </h3>
                      {sub.unread_count > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                          {sub.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600">
                      {sub.expires_at
                        ? `${daysRemaining(sub.expires_at)} days remaining`
                        : "—"}
                    </p>
                    {sub.last_message && (
                      <p className="mt-1 truncate text-sm text-gray-500">
                        {sub.last_message}
                        {sub.last_message_type === "image" ? "" : sub.last_message.length >= 50 ? "…" : ""}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/chat/${sub.id}`}
                    className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Open Chat
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Reviews */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Reviews
          </h2>
          {reviews.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
              No reviews yet
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">
                      {r.student_name ?? "Student"}
                    </p>
                    <p className="text-sm font-medium text-amber-600">
                      {r.rating}/5
                    </p>
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm text-gray-600">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
