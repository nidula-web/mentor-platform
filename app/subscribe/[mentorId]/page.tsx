"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Mentor, Profile } from "@/lib/supabase";

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
      const supabase = createClient();
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

    const supabase = createClient();

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
        amount_paid: 1900,
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
          <h1 className="text-xl font-semibold text-gray-900">Mentor not found</h1>
          <Link href="/browse" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Browse mentors
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
            We will verify and activate your mentorship within 24 hours.
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
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-xl font-bold text-blue-700">
            MentorLK
          </Link>
          <Link href="/browse" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            ← Back to mentors
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Subscribe to Mentor</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Mentor profile summary */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Your selected mentor
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
                  {mentor.profile?.full_name ?? "Mentor"}
                </h3>
                {mentor.university && (
                  <p className="text-gray-600">{mentor.university}</p>
                )}
                {mentor.al_stream && (
                  <p className="text-sm text-gray-500">
                    {mentor.al_stream}
                    {mentor.exam_type && ` • ${mentor.exam_type}`}
                  </p>
                )}
                {resultEntries.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {resultEntries.map(([subject, grade]) => (
                      <span
                        key={subject}
                        className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                      >
                        {subject}: {grade}
                      </span>
                    ))}
                  </div>
                )}
                {mentor.z_score != null && (
                  <p className="mt-1 text-sm text-gray-600">Z-Score: {mentor.z_score}</p>
                )}
              </div>
            </div>
          </section>

          {/* Subscription details */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Subscription details
            </h2>
            <div className="space-y-3 text-gray-700">
              <p className="text-xl font-semibold text-blue-600">
                Rs. 1,900 per month
              </p>
              <p>30 days of mentorship</p>
              <ul className="list-inside list-disc space-y-1 pl-2">
                <li>1 planning call</li>
                <li>Daily chat support</li>
                <li>Weekly check-ins</li>
                <li>Past paper review</li>
              </ul>
            </div>
          </section>

          {/* Payment section */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Payment
            </h2>
            <div className="mb-6 rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-800">
              <p>Bank: [Your Bank Name]</p>
              <p>Account: [Your Account Number]</p>
              <p>Name: [Your Name]</p>
            </div>
            <p className="mb-2 text-sm text-gray-600">
              After making the payment, upload a screenshot of the transaction.
            </p>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">
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
