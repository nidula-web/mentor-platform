"use client";
// @ts-nocheck

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [affiliate, setAffiliate] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);

  // Bank Form State
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [bankMessage, setBankMessage] = useState("");

  const supabase: any = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "mentor") {
        router.push("/mentor/dashboard");
        return;
      }

      setUser(user);
      await loadAffiliateData(user.id);
    }
    init();
  }, [router]);

  async function loadAffiliateData(userId: string) {
    setLoading(true);
    const { data: aff } = await supabase
      .from("affiliates")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (aff) {
      setAffiliate(aff);
      setBankName(aff.bank_name || "");
      setBranchName(aff.branch_name || "");
      setAccountNumber(aff.account_number || "");
      setAccountName(aff.account_name || "");

      // Load referrals
      const { data: refs } = await supabase
        .from("referrals")
        .select(`
          id, created_at, 
          student:referred_student_id(full_name, email)
        `)
        .eq("affiliate_id", userId)
        .order("created_at", { ascending: false });
      
      setReferrals(refs || []);

      // Load earnings
      const { data: earns } = await supabase
        .from("affiliate_earnings")
        .select(`
          id, amount, created_at,
          subscription:subscription_id(
            student:student_id(full_name),
            mentor:mentor_id(exam_type)
          )
        `)
        .eq("affiliate_id", userId)
        .order("created_at", { ascending: false });
      
      setEarnings(earns || []);
    }
    setLoading(false);
  }

  async function joinProgram() {
    setLoading(true);
    const code = `AFF-${user.id.substring(0, 8).toUpperCase()}`;
    const { error } = await supabase.from("affiliates").insert({
      id: user.id,
      referral_code: code,
    });
    
    if (!error) {
      await loadAffiliateData(user.id);
    } else {
      console.error(error);
      alert("Failed to join. " + error.message);
      setLoading(false);
    }
  }

  async function saveBankDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingBank(true);
    setBankMessage("");
    
    const { error } = await supabase
      .from("affiliates")
      .update({
        bank_name: bankName,
        branch_name: branchName,
        account_number: accountNumber,
        account_name: accountName,
      })
      .eq("id", user.id);
    
    if (error) {
      setBankMessage("Error saving details.");
    } else {
      setBankMessage("Bank details saved successfully!");
    }
    setSavingBank(false);
  }

  function copyLink() {
    const link = `${window.location.origin}/signup?ref=${affiliate.referral_code}`;
    navigator.clipboard.writeText(link);
    alert("Copied to clipboard!");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg text-center mt-20">
          <div className="text-6xl mb-6">🤝</div>
          <h2 className="text-3xl font-black text-gray-900">Become an Affiliate</h2>
          <p className="mt-4 text-gray-600 italic">
            Invite your friends to ExamCoach and earn commissions when they subscribe to a coach!
            <br/><br/>
            💰 <b>Rs. 300</b> for every A/L Coach subscription<br/>
            💰 <b>Rs. 150</b> for every O/L Coach subscription
          </p>
          <button
            onClick={joinProgram}
            className="mt-8 w-full rounded-2xl bg-green-600 px-4 py-4 text-lg font-black text-white hover:bg-green-700 shadow-xl shadow-green-600/20 transition-all active:scale-95"
          >
            Join the Program Now
          </button>
        </div>
      </div>
    );
  }

  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/signup?ref=${affiliate.referral_code}` : '';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Header Setup */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Affiliate Dashboard</h1>
            <p className="text-gray-500 font-medium">Manage your referrals and earnings.</p>
          </div>
          <div className="bg-green-100 text-green-800 px-6 py-3 rounded-2xl border border-green-200 shadow-sm text-center">
             <p className="text-xs uppercase font-black tracking-widest text-green-600/80 mb-1">Total Earned</p>
             <p className="text-2xl font-black">Rs. {(affiliate.total_earned || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (Main Info) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Link Box */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-black mb-2 text-gray-900">Your Referral Link</h2>
              <p className="text-sm text-gray-500 mb-6">Share this link with your friends. When they sign up and subscribe to a coach, you'll earn a commission.</p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  readOnly 
                  value={referralLink} 
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 font-medium font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button 
                  onClick={copyLink}
                  className="bg-green-600 text-white font-black px-6 py-3 rounded-xl hover:bg-green-700 transition-all shadow-md active:scale-95"
                >
                  Copy Link
                </button>
              </div>
            </div>

            {/* Referrals List */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-black mb-6 text-gray-900 border-b pb-4">Your Referrals ({referrals.length})</h2>
              
              {referrals.length === 0 ? (
                <div className="text-center py-8 text-gray-500 italic">
                  You haven't referred anyone yet. Share your link to get started!
                </div>
              ) : (
                <div className="space-y-4">
                  {referrals.map((ref) => (
                    <div key={ref.id} className="flex justify-between items-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div>
                        <p className="font-bold text-gray-900">{ref.student?.full_name}</p>
                        <p className="text-xs text-gray-500">{new Date(ref.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-xs font-black bg-blue-100 text-blue-800 px-3 py-1 rounded-full uppercase tracking-wider">
                        Joined
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Earnings History */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-black mb-6 text-gray-900 border-b pb-4">Earnings History</h2>
              
              {earnings.length === 0 ? (
                <div className="text-center py-8 text-gray-500 italic">
                  No earnings yet. Earnings will appear here when your referrals subscribe to a coach.
                </div>
              ) : (
                <div className="space-y-4">
                  {earnings.map((earn) => (
                    <div key={earn.id} className="flex justify-between items-center p-4 rounded-xl bg-green-50/50 border border-green-100">
                      <div>
                        <p className="font-bold text-gray-900 mb-1">Commision for {earn.subscription?.mentor?.exam_type} Coaching</p>
                        <p className="text-xs text-gray-500">Student: {earn.subscription?.student?.full_name}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{new Date(earn.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-lg font-black text-green-600">
                        +Rs. {earn.amount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column (Settings) */}
          <div className="space-y-8">
            
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-black mb-6 text-gray-900">Withdrawal Details</h2>
              <form onSubmit={saveBankDetails} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Commercial Bank"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Branch Name</label>
                  <input
                    type="text"
                    required
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Kollupitiya"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="1234567890"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Account Name</label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium"
                  />
                </div>

                {bankMessage && (
                  <div className={`p-3 rounded-lg text-sm font-bold ${bankMessage.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {bankMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingBank}
                  className="w-full bg-gray-900 text-white font-black px-4 py-3 rounded-xl mt-4 hover:bg-black transition-all active:scale-95 disabled:opacity-70"
                >
                  {savingBank ? 'Saving...' : 'Save Bank Details'}
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
