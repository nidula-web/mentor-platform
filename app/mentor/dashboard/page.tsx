"use client";
// @ts-nocheck

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Subscription, Mentor, Profile } from "@/lib/supabase";
import { getPricing } from "@/lib/pricing";
import CoachGuide from "@/components/CoachGuide";

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

type BankDetails = {
  id: string;
  bank_name: string;
  other_bank_name?: string;
  branch_name: string;
  account_number: string;
  account_holder_name: string;
};

function daysRemaining(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  const now = new Date();
  const exp = new Date(expiresAt);
  const diff = exp.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function getLastMondayOfMonth(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  let lastMonday = lastDay.getDate() - ((lastDay.getDay() + 6) % 7);
  const result = new Date(year, month, lastMonday);
  return result.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const SRI_LANKAN_BANKS = [
  "Bank of Ceylon", "People's Bank", "Commercial Bank", "Sampath Bank", 
  "HNB", "Seylan Bank", "NDB Bank", "NSB", "DFCC Bank", 
  "Pan Asia Bank", "Union Bank", "Amana Bank", "Other"
];

export default function MentorDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mentorName, setMentorName] = useState<string>("");
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [activeSubs, setActiveSubs] = useState<SubWithStudent[]>([]);
  const [expiredSubs, setExpiredSubs] = useState<SubWithStudent[]>([]);
  const [reviews, setReviews] = useState<ReviewWithStudent[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [newMaxStudents, setNewMaxStudents] = useState(10);
  const [mentorData, setMentorData] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInsta, setCopiedInsta] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  // Bank Details State
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankFormData, setBankFormData] = useState({
    bank_name: "",
    other_bank_name: "",
    branch_name: "",
    account_number: "",
    account_holder_name: ""
  });
  const [saveLoading, setSaveLoading] = useState(false);

  async function updateLimit() {
    const supabase: any = createClient();
    const { error }: any = await supabase
      .from("mentors")
      .update({ max_students: newMaxStudents })
      .eq("id", mentorId);
    
    if (!error) {
      setMentorData({ ...mentorData, max_students: newMaxStudents });
      setIsEditingLimit(false);
      alert("Capacity updated successfully!");
    }
  }

  async function handleSaveBankDetails() {
    if (!mentorId) return;
    
    // Validation
    if (!bankFormData.bank_name || !bankFormData.branch_name || !bankFormData.account_number || !bankFormData.account_holder_name) {
      alert("Please fill all required fields");
      return;
    }
    
    if (bankFormData.bank_name === "Other" && !bankFormData.other_bank_name) {
        alert("Please specify the bank name");
        return;
    }

    if (!/^\d{8,16}$/.test(bankFormData.account_number)) {
      alert("Account number must be 8-16 digits");
      return;
    }

    setSaveLoading(true);
    const supabase: any = createClient();
    
    const dataToSave = {
        mentor_id: mentorId,
        bank_name: bankFormData.bank_name,
        other_bank_name: bankFormData.bank_name === "Other" ? bankFormData.other_bank_name : null,
        branch_name: bankFormData.branch_name,
        account_number: bankFormData.account_number,
        account_holder_name: bankFormData.account_holder_name
    };

    const { data, error } = await supabase
      .from("coach_bank_details")
      .upsert(dataToSave, { onConflict: 'mentor_id' })
      .select()
      .single();

    if (error) {
      alert("Error saving bank details: " + error.message);
    } else {
      setBankDetails(data as BankDetails);
      setIsEditingBank(false);
      alert("Bank details saved successfully!");
    }
    setSaveLoading(false);
  }

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
      setMentorName(profile?.full_name ?? "Coach");

      const { data: mentor, error: mentorError } = await supabase
        .from("mentors")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (mentorError || !mentor) {
        setLoading(false);
        return;
      }

      // Check verification status
      if (!mentor.is_verified) {
        router.replace("/mentor/pending");
        return;
      }

      setMentorId(mentor.id);
      setMentorData(mentor);
      setNewMaxStudents(mentor.max_students || 10);
      
      const now = new Date().toISOString();
      const { data: subsData }: any = await supabase
        .from("subscriptions")
        .select("*")
        .eq("mentor_id", mentor.id)
        .in("status", ["active", "expired"]);

      if (!subsData?.length) {
        setActiveSubs([]);
      } else {
        const studentIds = subsData.map((s: any) => s.student_id);
        const { data: profilesData }: any = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds);
        const profileMap = new Map(
          (profilesData ?? []).map((p: any) => [p.id, p.full_name])
        );

        const subIds = subsData.map((s: any) => s.id);
        const { data: messagesData }: any = await supabase
          .from("messages")
          .select("id, subscription_id, sender_id, content, message_type, is_read")
          .in("subscription_id", subIds)
          .order("created_at", { ascending: false });

        const lastBySub = new Map<string, { content: string; message_type: string }>();
        const unreadBySub = new Map<string, number>();
        (messagesData ?? []).forEach((m: any) => {
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

        const withStudents: SubWithStudent[] = subsData.map((s: any) => {
          const last = lastBySub.get(s.id);
          return {
            ...s,
            student_name: profileMap.get(s.student_id) ?? null,
            last_message: last?.content ?? null,
            last_message_type: last?.message_type ?? null,
            unread_count: unreadBySub.get(s.id) ?? 0,
          };
        });
        
        const now = new Date();
        setActiveSubs(withStudents.filter(s => s.status === 'active' && s.expires_at && new Date(s.expires_at) > now));
        setExpiredSubs(withStudents.filter(s => s.status === 'expired' || (s.expires_at && new Date(s.expires_at) <= now)));
      }

      const { data: allReviews }: any = await supabase
        .from("reviews")
        .select("rating")
        .eq("mentor_id", mentor.id);
      if (allReviews?.length) {
        const total = allReviews.reduce((sum: any, r: any) => sum + r.rating, 0);
        setAvgRating(Math.round((total / allReviews.length) * 10) / 10);
      }

      const { data: reviewsData }: any = await supabase
        .from("reviews")
        .select("id, subscription_id, student_id, rating, comment")
        .eq("mentor_id", mentor.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (reviewsData?.length) {
        const studentIds = [...new Set(reviewsData.map((r: any) => r.student_id))];
        const { data: revProfiles }: any = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds);
        const revProfileMap = new Map(
          (revProfiles ?? []).map((p: any) => [p.id, p.full_name])
        );
        setReviews(
          reviewsData.map((r: any) => ({
            ...r,
            student_name: revProfileMap.get(r.student_id) ?? null,
          }))
        );
      } else {
        setReviews([]);
      }

      // Fetch Bank Details
      const { data: bankData }: any = await supabase
        .from("coach_bank_details")
        .select("*")
        .eq("mentor_id", mentor.id)
        .maybeSingle();
      
      if (bankData) {
        setBankDetails(bankData as BankDetails);
        setBankFormData({
            bank_name: bankData.bank_name,
            other_bank_name: bankData.other_bank_name || "",
            branch_name: bankData.branch_name,
            account_number: bankData.account_number,
            account_holder_name: bankData.account_holder_name
        });
      } else {
        setBankFormData(prev => ({ ...prev, account_holder_name: profile?.full_name || "" }));
      }

      setLoading(false);
    }
    load();

    // Check if guide should be shown
    const guideShown = localStorage.getItem("coach_guide_shown");
    if (!guideShown) {
      setShowGuide(true);
    }
  }, [router]);

  const handleCloseGuide = () => {
    localStorage.setItem("coach_guide_shown", "true");
    setShowGuide(false);
  };

  const handleShowGuideAgain = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowGuide(true);
  };

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
            Coach profile not found
          </h1>
          <Link href="/mentor/setup" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Complete setup
          </Link>
        </div>
      </div>
    );
  }

  const pricing = mentorData ? getPricing(mentorData.exam_type) : getPricing('AL');
  const totalEarned = activeSubs.length * pricing.coachEarns;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.host}/c/${mentorData?.share_code}` : `examcoach.lk/c/${mentorData?.share_code}`;

  const copyToClipboard = (text: string, type: 'link' | 'insta') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedInsta(true);
      setTimeout(() => setCopiedInsta(false), 2000);
    }
  };

  const shareWhatsApp = () => {
    const message = encodeURIComponent(`I'm an Exam Coach on ExamCoach! 🎓 Check out my profile: https://${shareUrl}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=https://${shareUrl}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="mx-auto max-w-5xl px-4 py-8 pt-24 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Welcome, {mentorName}
            </h1>
            
            {/* Share Profile Quick Actions */}
            <div className="flex items-center gap-2">
                <div className="hidden lg:flex flex-col items-end mr-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Your Share Link</p>
                    <p className="text-xs font-bold text-blue-600 truncate max-w-[150px]">{shareUrl}</p>
                </div>
                <button 
                    onClick={() => copyToClipboard(`https://${shareUrl}`, 'link')}
                    className="flex h-[44px] items-center gap-2 bg-white border border-gray-200 px-5 rounded-xl text-sm font-black text-gray-700 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
                >
                    {copiedLink ? (
                        <>
                            <span className="text-green-500 text-base">✓</span>
                            <span>Copied!</span>
                        </>
                    ) : (
                        <>
                            <span className="text-base">🔗</span>
                            <span>Copy Link</span>
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* Grow Your Students Section */}
        <section className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-1 shadow-xl shadow-blue-500/20">
                <div className="rounded-[14px] bg-white p-6 sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-md">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-600">NEW</span>
                                <h2 className="text-xl font-black text-gray-900">Grow Your Students</h2>
                            </div>
                            <p className="text-sm font-medium text-gray-500 leading-relaxed">
                                Share your personal profile link on social media to attract more students. Verified coaches see 3x more students when they share their link.
                            </p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                            <button 
                                onClick={shareWhatsApp}
                                className="flex grow h-[48px] items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-black text-white shadow-lg shadow-green-500/20 transition-all hover:bg-[#20bd5a] active:scale-95 sm:grow-0"
                            >
                                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.062c-3.414 0-6.194 2.78-6.194 6.194 0 1.258.375 2.454 1.05 3.473L6 18.75l3.14-.82a6.126 6.126 0 002.891.725h.002c3.413 0 6.193-2.78 6.193-6.194 0-3.413-2.78-6.193-6.193-6.193zm3.763 8.751c-.156.438-.769.805-1.056.852-.287.046-.644.073-1.051-.059-.251-.082-.576-.192-1.025-.386-1.912-.828-3.144-2.776-3.239-2.903-.095-.127-.775-.989-.775-1.902 0-.913.483-1.36.654-1.551.171-.191.373-.238.497-.238.125 0 .25.002.359.006.113.003.262-.043.41.312.152.363.52 1.272.565 1.363.045.09.075.195.015.312-.06.117-.091.19-.181.294-.09.105-.189.233-.27.312-.09.088-.184.184-.079.363.105.18.467.77.994 1.242.678.608 1.248.796 1.428.886.18.09.285.075.39-.045.105-.121.45-.525.57-.705.12-.18.24-.151.405-.09.165.061 1.037.489 1.217.579.18.09.3.136.345.211.045.075.045.438-.111.876z"/></svg>
                                <span>WhatsApp</span>
                            </button>
                            <button 
                                onClick={shareFacebook}
                                className="flex grow h-[48px] items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#166fe5] active:scale-95 sm:grow-0"
                            >
                                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.791-4.667 4.53-4.667 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                <span>Facebook</span>
                            </button>
                            <button 
                                onClick={() => copyToClipboard(`🎓 I'm coaching O/L/A/L students on ExamCoach! Check my profile 👆 https://${shareUrl} Link in bio`, 'insta')}
                                className="flex grow h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] px-5 text-sm font-black text-white shadow-xl shadow-pink-500/10 transition-all active:scale-95 sm:grow-0"
                            >
                                <span className="text-base">📸</span>
                                <span>{copiedInsta ? "Copied!" : "For Instagram"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Stats */}
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Student Capacity</p>
                <button 
                    onClick={() => setIsEditingLimit(!isEditingLimit)}
                    className="text-xs text-blue-600 font-bold hover:underline"
                >
                    {isEditingLimit ? "Cancel" : "Update Limit"}
                </button>
            </div>
            
            {isEditingLimit ? (
                <div className="flex items-center gap-2 mt-2">
                    <select 
                        value={newMaxStudents}
                        onChange={(e) => setNewMaxStudents(parseInt(e.target.value))}
                        className="text-sm border rounded px-2 py-1 flex-1"
                    >
                        {[5, 10, 15, 20, 25, 30, 40, 50].map(n => (
                            <option key={n} value={n}>{n} students</option>
                        ))}
                    </select>
                    <button 
                        onClick={updateLimit}
                        className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded font-bold"
                    >
                        Save
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex items-end justify-between">
                        <p className="text-2xl font-bold text-gray-900">
                            {mentorData?.current_student_count || 0} / {mentorData?.max_students || 10}
                        </p>
                        <p className="text-xs text-gray-500 font-medium mb-1">Students</p>
                    </div>
                    <div className="mt-3 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                                ((mentorData?.current_student_count || 0) / (mentorData?.max_students || 10)) >= 0.9 
                                ? "bg-red-500" 
                                : "bg-blue-600"
                            }`}
                            style={{ 
                                width: `${Math.min(100, ((mentorData?.current_student_count || 0) / (mentorData?.max_students || 10)) * 100)}%` 
                            }}
                        />
                    </div>
                </>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-600">Total Earned</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              Rs. {totalEarned.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-600">Your Rating</p>
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
              {activeSubs.map((sub: any) => (
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
        <section className="mb-12">
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

        {/* Bank Details & Payouts */}
        <section className="mb-12">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Payment & Payouts
            </h2>
            
            <div className="grid gap-6 sm:grid-cols-2">
                {/* Bank Details Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    {isEditingBank ? (
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900">Update Bank Details</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bank Name</label>
                                    <select 
                                        value={bankFormData.bank_name}
                                        onChange={(e) => setBankFormData({...bankFormData, bank_name: e.target.value})}
                                        className="w-full text-sm border rounded-lg px-3 py-2"
                                    >
                                        <option value="">Select Bank</option>
                                        {SRI_LANKAN_BANKS.map(bank => (
                                            <option key={bank} value={bank}>{bank}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {bankFormData.bank_name === "Other" && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Specify Bank</label>
                                        <input 
                                            type="text"
                                            value={bankFormData.other_bank_name}
                                            onChange={(e) => setBankFormData({...bankFormData, other_bank_name: e.target.value})}
                                            className="w-full text-sm border rounded-lg px-3 py-2"
                                            placeholder="Enter bank name"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Branch Name</label>
                                    <input 
                                        type="text"
                                        value={bankFormData.branch_name}
                                        onChange={(e) => setBankFormData({...bankFormData, branch_name: e.target.value})}
                                        className="w-full text-sm border rounded-lg px-3 py-2"
                                        placeholder="Enter branch"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Number</label>
                                    <input 
                                        type="text"
                                        value={bankFormData.account_number}
                                        onChange={(e) => setBankFormData({...bankFormData, account_number: e.target.value.replace(/\D/g, '')})}
                                        className="w-full text-sm border rounded-lg px-3 py-2"
                                        placeholder="8-16 digits"
                                        maxLength={16}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Holder Name</label>
                                    <input 
                                        type="text"
                                        value={bankFormData.account_holder_name}
                                        onChange={(e) => setBankFormData({...bankFormData, account_holder_name: e.target.value})}
                                        className="w-full text-sm border rounded-lg px-3 py-2"
                                        placeholder="As per bank records"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button 
                                        onClick={handleSaveBankDetails}
                                        disabled={saveLoading}
                                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {saveLoading ? "Saving..." : "Save Details"}
                                    </button>
                                    <button 
                                        onClick={() => setIsEditingBank(false)}
                                        className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg font-bold text-sm hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : bankDetails ? (
                        <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-green-600">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                                    <span className="font-bold text-sm">Bank Details Saved</span>
                                </div>
                                <button 
                                    onClick={() => setIsEditingBank(true)}
                                    className="text-xs text-blue-600 font-bold hover:underline"
                                >
                                    Edit Details
                                </button>
                            </div>
                            
                            <div className="space-y-3 flex-1">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Bank</p>
                                    <p className="font-bold text-gray-900">{bankDetails.bank_name === "Other" ? bankDetails.other_bank_name : bankDetails.bank_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Branch</p>
                                    <p className="text-sm font-semibold text-gray-700">{bankDetails.branch_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Account</p>
                                    <p className="text-sm font-bold text-gray-900 tracking-widest">
                                        ****{bankDetails.account_number.slice(-4)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 h-full flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="font-black text-gray-900 mb-1">Add Your Bank Details</h3>
                            <p className="text-xs text-amber-800 mb-6">You need to add your bank account to receive your monthly earnings.</p>
                            <button 
                                onClick={() => setIsEditingBank(true)}
                                className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-amber-600/20 hover:bg-amber-700 active:scale-95 transition-all"
                            >
                                Add Bank Details
                            </button>
                        </div>
                    )}
                </div>

                {/* Payout Info Card */}
                <div className="rounded-xl border border-gray-200 bg-blue-600 p-6 shadow-sm text-white">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                            <span className="text-lg">💰</span>
                        </div>
                        <h3 className="font-bold text-lg">Payout Information</h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <p className="text-blue-100 text-xs font-medium mb-1">Current Month Earnings</p>
                            <p className="text-3xl font-black">Rs. {totalEarned.toLocaleString()}</p>
                            <p className="text-[10px] text-blue-200 mt-1 font-bold uppercase">Rate: Rs. {pricing.coachEarns.toLocaleString()} / student</p>
                        </div>

                        <div>
                            <p className="text-blue-100 text-xs font-medium mb-1">Next Payout Date</p>
                            <p className="text-xl font-bold bg-white/10 px-3 py-1.5 rounded-lg inline-block">{getLastMondayOfMonth()}</p>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <p className="text-[11px] text-blue-100 leading-relaxed italic opacity-80">
                                "Your earnings are automatically transferred to your bank account during the last week of every month."
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
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

      {showGuide && <CoachGuide onClose={handleCloseGuide} />}
    </div>
  );
}

