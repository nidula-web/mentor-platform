"use client";
// @ts-nocheck

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<"student" | "mentor">(() => {
    const r = searchParams.get("role");
    return r === "mentor" ? "mentor" : "student";
  });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    const r = searchParams.get("role");
    if (r === "mentor" || r === "student") setRole(r);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreedToTerms) {
      setError("Please agree to the Terms & Conditions and Privacy Policy.");
      setLoading(true);
      setLoading(false);
      return;
    }

    const supabase: any = createClient();

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setError("Sign up failed. Please try again.");
      setLoading(false);
      return;
    }

    if (!phone) {
      setError("Phone number is required.");
      setLoading(false);
      return;
    }

    // Sri Lankan phone validation: 07XXXXXXXX or +947XXXXXXXX
    const slPhoneRegex = /^(?:\+94|0)7[0-9]{8}$/;
    if (!slPhoneRegex.test(phone.replace(/\s/g, ""))) {
      setError("Please enter a valid Sri Lankan phone number (e.g., 077 123 4567).");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        full_name: fullName,
        email,
        phone: phone.trim(),
        role,
      });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (role === "student") {
      try {
        const refCode = localStorage.getItem("referral_code");
        if (refCode) {
          // Find the affiliate by code
          const { data: affiliate } = await supabase
            .from("affiliates")
            .select("id")
            .eq("referral_code", refCode)
            .single();

          if (affiliate) {
            // Create referral linking affiliate and new student
            await supabase.from("referrals").insert({
              affiliate_id: affiliate.id,
              referred_student_id: userId,
            });
          }
        }
      } catch (err) {
        console.error("Referral tracking error:", err);
      }
    }

    if (role === "mentor") {
      router.push("/mentor/setup");
    } else {
      router.push("/browse");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-8 text-center">
            <Link href="/" className="text-xl font-bold text-blue-700">
              ExamCoach
            </Link>
          </div>
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Create account</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-gray-800">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full h-[48px] rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-base"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-800">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-[48px] rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-base"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-800">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-[48px] rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-base"
                placeholder="Min 6 characters"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">
                Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`rounded-xl border-2 px-2 sm:px-4 py-3 sm:py-4 text-center text-xs sm:text-sm font-medium transition-colors ${
                    role === "student"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-900 hover:border-gray-400"
                  }`}
                >
                  I am a Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("mentor")}
                  className={`rounded-xl border-2 px-2 sm:px-4 py-3 sm:py-4 text-center text-xs sm:text-sm font-medium transition-colors ${
                    role === "mentor"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-900 hover:border-gray-400"
                  }`}
                >
                  I am a Coach
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-800">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className={`w-full h-[48px] rounded-lg border px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-base ${
                  error && error.includes("phone") ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., 077 123 4567"
              />
            </div>

            <div className="flex items-start gap-3 py-2">
              <input
                id="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                I agree to the{" "}
                <Link href="/terms" className="font-medium text-blue-600 hover:text-blue-700" target="_blank">
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-medium text-blue-600 hover:text-blue-700" target="_blank">
                  Privacy Policy
                </Link>
              </label>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="w-full h-[52px] rounded-lg bg-blue-600 font-black text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-60 shadow-lg shadow-blue-600/20 mt-4"
            >
              {loading ? "Creating account…" : "Sign Up"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-100 italic">
        Loading...
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}

