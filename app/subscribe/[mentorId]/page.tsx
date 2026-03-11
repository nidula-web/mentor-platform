"use client";
// @ts-nocheck

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Mentor, Profile } from "@/lib/supabase";
import { getPricing } from "@/lib/pricing";

type MentorWithProfile = Mentor & {
  profile: Pick<Profile, "full_name" | "profile_picture"> | null;
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

export default function SubscribePage() {
  const params = useParams();
  const router = useRouter();
  const mentorId = params.mentorId as string;

  const [mentor, setMentor] = useState<MentorWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      const supabase: any = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);

      const { data: mentorData, error: mentorError } = await supabase
        .from("mentors")
        .select("*")
        .eq("id", mentorId)
        .single();

      if (mentorError || !mentorData) {
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, profile_picture")
        .eq("id", mentorData.user_id)
        .single();

      setMentor({
        ...mentorData,
        profile: profileData ?? null,
      });
      setLoading(false);
    }
    load();
  }, [mentorId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!userId || !mentor) {
      setError("Missing data. Please refresh and try again.");
      setSubmitting(false);
      return;
    }

    if (!paymentFile) {
      setError("Please upload your payment screenshot.");
      setSubmitting(false);
      return;
    }

    const supabase: any = createClient();

    try {
      const path = `${userId}/${mentorId}-${Date.now()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(path, paymentFile, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(uploadData.path);
      const paymentProofUrl = urlData.publicUrl;

      const { error: insertError } = await supabase.from("subscriptions").insert({
        student_id: userId,
        mentor_id: mentorId,
        status: "pending",
        payment_proof_url: paymentProofUrl,
        amount_paid: getPricing(mentor.exam_type).studentPays,
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => router.push("/student/dashboard"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Coach not found</h1>
          <Link href="/browse" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Browse coaches
          </Link>
        </div>
      </div>
    );
  }

  const results = mentor.results as Record<string, string> | null;
  const resultEntries = results
    ? Object.entries(results).filter(
        ([k]) => k !== "result_sheet_url" && typeof results[k] === "string"
      )
    : [];

  const pricing = getPricing(mentor.exam_type);

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-2xl border border-green-200 bg-green-50 p-8 text-center shadow-sm">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-green-800">Payment submitted!</h2>
          <p className="text-green-700">
            We will verify and activate your coaching within 24 hours.
          </p>
          <p className="mt-4 text-sm text-green-600">
            Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="mx-auto max-w-4xl px-4 py-8 pt-24 sm:px-6">
        <Link href="/browse" className="mb-6 inline-block text-sm font-medium text-blue-600 hover:underline">
          ← Back to coaches
        </Link>
        <h1 className="mb-8 text-2xl font-bold text-gray-900 sm:text-3xl">Subscribe to Coach</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Mentor profile summary */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Your selected coach
            </h2>
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
                {mentor.profile?.profile_picture ? (
                  <img
                    src={mentor.profile.profile_picture}
                    alt=""
                    className="h-16 w-16 object-cover"
                  />
                ) : (
                  <DefaultAvatar className="h-16 w-16" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {mentor.profile?.full_name ?? "Coach"}
                </h3>
                {mentor.university && (
                  <p className="text-gray-600">{mentor.university}</p>
                )}
                {mentor.al_stream && (
                  <p className="text-sm text-gray-600">
                    {mentor.al_stream}
                    {mentor.exam_type && ` • ${mentor.exam_type}`}
                  </p>
                )}
                {resultEntries.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {resultEntries.map(([subject, grade]) => {
                      let gradeColor = "bg-gray-800 text-white";
                      switch (grade.toUpperCase()) {
                        case "A": gradeColor = "bg-green-600 text-white"; break;
                        case "B": gradeColor = "bg-blue-600 text-white"; break;
                        case "C": gradeColor = "bg-yellow-500 text-white"; break;
                        case "S": gradeColor = "bg-orange-500 text-white"; break;
                        case "F": gradeColor = "bg-red-600 text-white"; break;
                      }
                      return (
                        <span
                          key={subject}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${gradeColor}`}
                        >
                          {subject}: {grade}
                        </span>
                      );
                    })}
                  </div>
                )}
                {mentor.z_score != null && (
                  <p className="mt-1 text-sm text-gray-600">Z-Score: {mentor.z_score}</p>
                )}
              </div>
            </div>
          </section>

          {/* Subscription details */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Subscription details
            </h2>
            <div className="space-y-3 text-gray-700">
              <p className="text-xl font-semibold text-blue-600">
                Rs. {pricing.studentPays.toLocaleString()} per month
              </p>
              <p>30 days of coaching</p>
              <ul className="list-inside list-disc space-y-1 pl-2">
                <li>✅ Personalized study plan</li>
                <li>✅ Daily chat support</li>
                <li>✅ Voice note explanations</li>
                <li>✅ Weekly progress check-ins</li>
                <li>✅ Past paper Hacks & Rankers only secret methods</li>
              </ul>
            </div>
          </section>

          {/* Payment section */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Payment
            </h2>
            <div className="mb-6 space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Option 1: Sampath Bank</p>
                <div className="font-mono text-sm text-gray-800 space-y-1">
                  <p><span className="text-gray-400">Bank:</span> Sampath Bank PLC</p>
                  <p><span className="text-gray-400">Account:</span> 102352939821</p>
                  <p><span className="text-gray-400">Name:</span> PANN PINIDIYA ARACHCHI</p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Option 2: Hatton National Bank (HNB)</p>
                <div className="font-mono text-sm text-gray-800 space-y-1">
                  <p><span className="text-gray-400">Bank:</span> Hatton National Bank</p>
                  <p><span className="text-gray-400">Account:</span> 074020299025</p>
                  <p><span className="text-gray-400">Name:</span> PANN PINIDIYA ARACHCHI</p>
                </div>
              </div>
            </div>
            <p className="mb-2 text-sm text-gray-600">
              After making the payment, upload a screenshot of the transaction.
            </p>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-800">
                Upload Payment Screenshot
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setPaymentFile(e.target.files?.[0] ?? null)}
                required
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>
          </section>

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Confirm Subscription"}
          </button>
        </form>
      </main>
    </div>
  );
}
