'use client'
// @ts-nocheck

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

function calculateCoachScore(mentor: any) {
  let score = 0;

  // Count A grades (highest weight)
  if (mentor.results) {
    const results = typeof mentor.results === 'string' 
      ? JSON.parse(mentor.results) 
      : mentor.results;
    
    Object.values(results).forEach((grade: any) => {
      if (grade === 'A') score += 10;
      if (grade === 'B') score += 6;
      if (grade === 'C') score += 3;
      if (grade === 'S') score += 1;
    });
  }

  // Z-score bonus (if A/L)
  if (mentor.z_score) {
    score += mentor.z_score * 5;
  }

  // University bonus
  const topUnis = ['moratuwa', 'colombo', 'peradeniya', 'kelaniya', 'jaffna', 'ruhuna'];
  if (mentor.university) {
    const uniLower = mentor.university.toLowerCase();
    if (topUnis.some(u => uniLower.includes(u))) {
      score += 5;
    }
  }

  return score;
}


export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [topCoaches, setTopCoaches] = useState<any[]>([]);
  

  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const supabase: any = createClient();

  useEffect(() => {
    async function getInitialData() {
      // 1. Auth Data
      const { data: { user } }: any = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile }: any = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setRole(profile.role);
          if (profile.role === "mentor") {
            const { data: mentor }: any = await supabase
              .from("mentors")
              .select("id")
              .eq("user_id", user.id)
              .single();
            if (mentor) setMentorId(mentor.id);
          }
        }
      }

      // Fetch all verified coaches
      const { data: allCoaches } = await supabase
        .from("mentors")
        .select("*")
        .eq("is_verified", true);

      if (allCoaches && allCoaches.length > 0) {
        let scoredCoaches = [];
        
        for (const coach of allCoaches) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_picture')
            .eq('id', coach.user_id)
            .single();

          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('mentor_id', coach.id);

          let averageRating = null;
          let reviewCount = 0;
          if (reviews && reviews.length > 0) {
            reviewCount = reviews.length;
            const sum = reviews.reduce((acc: any, r: any) => acc + r.rating, 0);
            averageRating = sum / reviewCount;
          }

          const score = calculateCoachScore(coach);

          scoredCoaches.push({
            ...coach,
            profile,
            score,
            averageRating,
            reviewCount
          });
        }

        // Sort by score (highest first)
        scoredCoaches.sort((a, b) => b.score - a.score);

        // Take top 3
        setTopCoaches(scoredCoaches.slice(0, 3));
      }

      setLoading(false);
    }
    getInitialData();
  }, []);

  const heroText = !user 
    ? "Find Your Perfect Exam Coach" 
    : role === "mentor" 
      ? "Welcome back, Coach!" 
      : "Welcome back! Ready to ace your exams?";

  const faqs = [
    {
      q: "What is ExamCoach?",
      a: "ExamCoach connects O/L and A/L students with university students who recently aced the same exams. Your coach guides you through chat and voice notes for 30 days."
    },
    {
      q: "Who are the coaches?",
      a: "Our coaches are verified university students who scored top results at O/Ls or A/Ls. We manually verify every coach's exam results before they can accept students."
    },
    {
      q: "Is this a replacement for tuition classes?",
      a: "No! ExamCoach is a supplement. Your coach helps you with study planning, past paper review, and answering your specific questions - things a mass tuition class cannot provide."
    },
    {
      q: "How much does it cost?",
      a: "O/L coaching starts from Rs. 500/month. A/L coaching starts from Rs. 800/month. This includes 30 days of daily chat support and personalized guidance."
    },
    {
      q: "Is my child safe on the platform?",
      a: "Absolutely. We protect our students by keeping all communication within our secure platform. Our automated systems and admin team work together to ensure a safe, supportive learning environment where personal privacy is always preserved."
    },
    {
      q: "What if I'm not satisfied?",
      a: "We offer a full refund within the first 48 hours of your subscription."
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
      
      {/* SECTION 1: Hero */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-40 bg-gradient-to-b from-blue-50 to-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-200/40 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold mb-8 animate-bounce">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Sri Lanka's #1 Coaching Platform
          </div>
          <h1 className="mb-8 text-3xl sm:text-7xl lg:text-8xl font-black tracking-tight text-gray-900 leading-[1.1]">
            {heroText}
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg sm:text-2xl text-gray-600 font-medium leading-relaxed italic">
            Personalized guidance from top university achievers to help you master O/L and A/L exams.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row px-4">
            {!user ? (
                <>
                  <Link
                    href="/signup"
                    className="flex w-full sm:max-w-xs items-center justify-center rounded-2xl bg-blue-600 px-8 py-5 text-lg sm:text-xl font-black text-white shadow-2xl shadow-blue-600/40 transition-all hover:bg-blue-700 hover:-translate-y-1 active:scale-95 text-center"
                  >
                    Find Your Exam Coach
                  </Link>
                  <Link
                    href="/signup?role=mentor"
                    className="flex w-full sm:max-w-xs items-center justify-center rounded-2xl bg-slate-900 px-8 py-5 text-lg sm:text-xl font-black text-white transition-all hover:bg-black hover:-translate-y-1 active:scale-95 shadow-xl text-center"
                  >
                    Apply as a Coach
                  </Link>
                </>
              ) : role === "mentor" ? (
                <>
                  <Link
                    href="/mentor/dashboard"
                    className="flex w-full sm:max-w-xs items-center justify-center rounded-2xl bg-blue-600 px-8 py-5 text-lg sm:text-xl font-black text-white shadow-2xl shadow-blue-600/40 transition-all hover:bg-blue-700 hover:-translate-y-1 active:scale-95 text-center"
                  >
                    Go to Dashboard
                  </Link>
                  {mentorId && (
                    <Link
                      href={`/coach/${mentorId}`}
                      className="flex w-full sm:max-w-xs items-center justify-center rounded-2xl bg-slate-900 px-8 py-5 text-lg sm:text-xl font-black text-white transition-all hover:bg-black hover:-translate-y-1 active:scale-95 text-center"
                    >
                      View Your Profile
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href="/student/dashboard"
                    className="flex w-full sm:max-w-xs items-center justify-center rounded-2xl bg-blue-600 px-8 py-5 text-lg sm:text-xl font-black text-white shadow-2xl shadow-blue-600/40 transition-all hover:bg-blue-700 hover:-translate-y-1 active:scale-95 text-center"
                  >
                    My Dashboard
                  </Link>
                  <Link
                    href="/browse"
                    className="flex w-full sm:max-w-xs items-center justify-center rounded-2xl bg-slate-900 px-8 py-5 text-lg sm:text-xl font-black text-white transition-all hover:bg-black hover:-translate-y-1 active:scale-95 text-center"
                  >
                    Browse Coaches
                  </Link>
                </>
              )}
          </div>
        </div>
      </section>

      {/* SECTION 2: How It Works */}
      <section className="py-24 bg-white border-y border-gray-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">How ExamCoach Works</h2>
            <p className="text-gray-500 font-medium italic text-sm sm:text-base px-4">Three simple steps to academic excellence</p>
          </div>
          <div className="grid gap-6 sm:gap-12 md:grid-cols-3">
            {[
              { step: 1, icon: "🔍", title: "Find a Verified Coach", desc: "Browse coaches who got top results in the same exam you're preparing for" },
              { step: 2, icon: "💬", title: "Start Learning", desc: "Get daily chat support, voice note explanations, and a personalized study plan" },
              { step: 3, icon: "🏆", title: "Ace Your Exam", desc: "Follow your coach's proven strategies and improve your grades" }
            ].map((s) => (
              <div key={s.step} className="group relative bg-gray-50 p-6 sm:p-8 rounded-3xl transition-all hover:bg-white hover:shadow-2xl hover:shadow-blue-600/10 border border-transparent hover:border-blue-100">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-6 group-hover:scale-110 transition-transform">
                  {s.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-black mb-3">{s.title}</h3>
                <p className="text-sm sm:text-gray-600 leading-relaxed font-medium">{s.desc}</p>
                <span className="absolute top-6 sm:top-8 right-6 sm:right-8 text-4xl sm:text-6xl font-black text-blue-600/5 select-none">{s.step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* SECTION 4: Trust Badges */}
      <section className="py-12 bg-white flex justify-center overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="flex gap-8 px-6">
          {[
            { tag: "🔒", title: "Safe & Secure", sub: "Protected chats" },
            { tag: "✅", title: "Verified Results", sub: "Verified for your safety" },
            { tag: "💬", title: "Privacy First", sub: "Your info is protected" },
            { tag: "💰", title: "48h Guarantee", sub: "Hassle-free refund" },
            { tag: "🇱🇰", title: "Made in Sri Lanka", sub: "Local achievers" }
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100">
              <span className="text-2xl">{b.tag}</span>
              <div>
                <p className="text-sm font-black text-gray-900">{b.title}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: Meet Our Top Coaches */}
      <section className="py-24 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 tracking-tight">Meet Our Top Coaches</h2>
            <p className="text-gray-500 font-medium italic text-sm sm:text-base">Verified high achievers ready to guide you.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {topCoaches.map((coach, index) => {
              let badge = "";
              let borderClass = "";
              let titleColor = "";
              if (index === 0) {
                badge = "🥇 #1 Top Coach";
                borderClass = "border-amber-300 shadow-amber-100";
                titleColor = "text-amber-600 bg-amber-50";
              } else if (index === 1) {
                badge = "🥈 #2 Top Coach";
                borderClass = "border-slate-300 shadow-slate-100";
                titleColor = "text-slate-600 bg-slate-50";
              } else if (index === 2) {
                badge = "🥉 #3 Top Coach";
                borderClass = "border-orange-200 shadow-orange-50";
                titleColor = "text-orange-600 bg-orange-50";
              }

              const results = typeof coach.results === 'string' ? JSON.parse(coach.results) : coach.results;
              const resultEntries = results
                ? Object.entries(results).filter(
                    ([k]) =>
                      k !== "result_sheet_url" &&
                      typeof results[k] === "string"
                  )
                : [];

              return (
                <div key={coach.id} className={`group relative rounded-3xl bg-white p-8 shadow-sm transition-all hover:shadow-2xl border ${borderClass} hover:-translate-y-2 flex flex-col mt-4`}>
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-5 py-1.5 text-sm font-black whitespace-nowrap shadow-sm border ${borderClass} ${titleColor}`}>
                    {badge}
                  </div>

                  <div className="flex flex-col items-center text-center gap-4 mb-6 mt-2">
                    <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-gray-50 shadow-inner">
                      {coach.profile?.profile_picture ? (
                       <img src={coach.profile.profile_picture} alt={coach.profile.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-blue-100 text-blue-600">
                          <span className="text-4xl">👤</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5">
                        {coach.profile?.full_name || "Verified Coach"}
                        <span className="text-sm bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md flex items-center leading-none" title="Verified">✓</span>
                      </h3>
                      <p className="text-sm font-bold text-gray-500 mt-1">
                        {coach.exam_type === "A/L" ? (coach.university || "University Achiever") : "O/L Top Achiever"}
                      </p>
                      {coach.averageRating && coach.reviewCount > 0 && (
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <span className="text-yellow-400">⭐</span>
                          <span className="text-sm font-bold text-gray-700">{coach.averageRating.toFixed(1)}</span>
                          <span className="text-xs text-gray-400">({coach.reviewCount})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-8 space-y-4 flex-1">
                    {coach.z_score && coach.exam_type === "A/L" && (
                       <div className="text-center bg-blue-50 text-blue-700 py-2 px-3 rounded-lg text-sm font-black border border-blue-100">
                         Z-Score: {coach.z_score}
                       </div>
                    )}
                    
                    {resultEntries.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {resultEntries.map(([subject, grade]: any) => {
                          let gradeColor = "bg-gray-800 text-white";
                          switch (grade.toUpperCase()) {
                            case "A": gradeColor = "bg-green-600 text-white"; break;
                            case "B": gradeColor = "bg-blue-600 text-white"; break;
                            case "C": gradeColor = "bg-yellow-500 text-white"; break;
                            case "S": gradeColor = "bg-gray-400 text-white"; break;
                            case "F": gradeColor = "bg-red-600 text-white"; break;
                          }
                          return (
                            <span
                              key={subject}
                              className={`rounded-md px-2.5 py-1 text-xs font-bold shadow-sm ${gradeColor}`}
                            >
                              {subject}: {grade}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {role !== "mentor" && (
                    <Link
                      href={user && role === "student" ? `/coach/${coach.id}` : `/signup`}
                      className="mt-auto block w-full rounded-xl bg-gray-900 px-4 py-3.5 text-center text-sm font-black text-white hover:bg-black transition-colors shadow-lg active:scale-95"
                    >
                      View Profile
                    </Link>
                  )}
                </div>
              );
            })}

            {topCoaches.length < 3 && (
              <div className="group relative rounded-3xl bg-blue-50/50 p-8 shadow-inner transition-all border-2 border-dashed border-blue-200 hover:border-blue-400 flex flex-col items-center justify-center text-center mt-4">
                <span className="text-5xl mb-4">🎓</span>
                <h3 className="text-xl font-black text-blue-900 mb-2">Could this be you?</h3>
                <p className="text-blue-700 font-medium mb-8">Top achievers are joining ExamCoach.</p>
                <Link
                  href="/signup?role=mentor"
                  className="mt-auto inline-block rounded-xl bg-blue-600 px-6 py-3.5 font-black text-white shadow-lg hover:bg-blue-700 transition-all active:scale-95 w-full"
                >
                  Apply as Coach
                </Link>
              </div>
            )}
          </div>
          
          <div className="mt-16 text-center">
            <Link 
              href="/browse"
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-8 py-4 text-sm sm:text-base font-black text-white hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95 shadow-xl shadow-blue-600/20"
            >
              Browse All Coaches
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 7: FAQ */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 text-center mb-12 sm:mb-16">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors touch-target"
                >
                  <span className="font-black text-gray-900 italic text-sm sm:text-base">{faq.q}</span>
                  <span className={`text-xl sm:text-2xl transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed italic">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: Final CTA */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto rounded-[60px] bg-gradient-to-br from-blue-600 to-blue-900 p-12 sm:p-24 text-center text-white relative overflow-hidden shadow-2xl shadow-blue-900/40">
           <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl" />
           <div className="relative z-10">
              <h2 className="text-3xl sm:text-6xl font-black mb-6 tracking-tight italic">Ready to Ace Your Next Exam?</h2>
              <p className="text-lg sm:text-2xl text-blue-100 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">Join hundreds of Sri Lankan students who are already improving their grades with dedicated university mentors.</p>
              
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row w-full px-4">
                <Link 
                  href={user ? "/browse" : "/signup"}
                  className="w-full sm:w-auto bg-white text-blue-900 px-10 py-5 rounded-2xl font-black text-lg sm:text-xl hover:scale-105 active:scale-95 transition-all shadow-xl text-center"
                >
                  Find Your Coach
                </Link>
                {!user && (
                   <Link 
                    href="/signup?role=mentor"
                    className="w-full sm:w-auto bg-blue-500/30 backdrop-blur-md border border-white/20 text-white px-10 py-5 rounded-2xl font-black text-lg sm:text-xl hover:bg-blue-500/50 transition-all active:scale-95 text-center"
                  >
                    Apply as Coach
                  </Link>
                )}
              </div>
           </div>
        </div>
      </section>

    </div>
  );
}
