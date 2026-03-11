"use client";
// @ts-nocheck

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type FeaturedCoach = {
  id: string;
  user_id: string;
  full_name: string;
  profile_picture: string | null;
  university: string;
  exam_type: string;
  average_rating: number;
  subject: string;
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Stats State
  const [stats, setStats] = useState({
    coaches: 0,
    students: 0,
    messages: 0,
    rating: 0
  });

  // Featured Coaches
  const [featuredCoaches, setFeaturedCoaches] = useState<FeaturedCoach[]>([]);

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

      // 2. Fetch Stats
      const [
        { count: coachesCount },
        { count: studentsCount },
        { count: msgsCount },
        { data: reviewsData }
      ] = await Promise.all([
        supabase.from("mentors").select("*", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("rating")
      ]);

      const avgRating = reviewsData && reviewsData.length > 0 
        ? reviewsData.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewsData.length 
        : 4.9;

      setStats({
        coaches: coachesCount || 0,
        students: studentsCount || 0,
        messages: msgsCount || 0,
        rating: Number(avgRating.toFixed(1))
      });

      // 3. Fetch Featured Coaches
      const { data: topMentors }: any = await supabase
        .from("mentors")
        .select(`
          id,
          user_id,
          university,
          exam_type,
          subjects,
          profiles:user_id(full_name, profile_picture)
        `)
        .eq("is_verified", true)
        .limit(10); // Get a few to calculate top ratings

      if (topMentors) {
        const coachesWithRatings = await Promise.all(topMentors.map(async (m: any) => {
          const { data: reviews }: any = await supabase.from("reviews").select("rating").eq("mentor_id", m.id);
          const avg = reviews && reviews.length > 0 
            ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length 
            : 5.0;
          return {
            id: m.id,
            user_id: m.user_id,
            full_name: m.profiles?.full_name || "Coach",
            profile_picture: m.profiles?.profile_picture,
            university: m.university,
            exam_type: m.exam_type,
            average_rating: avg,
            subject: m.subjects?.[0] || m.exam_type
          };
        }));
        setFeaturedCoaches(coachesWithRatings.sort((a,b) => b.average_rating - a.average_rating).slice(0, 3));
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
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold mb-8 animate-bounce">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Sri Lanka's #1 Coaching Platform
          </div>
          <h1 className="mb-8 text-5xl font-black tracking-tight text-gray-900 sm:text-7xl lg:text-8xl leading-[1.1]">
            {heroText}
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-xl text-gray-600 sm:text-2xl font-medium leading-relaxed">
            Personalized guidance from top university achievers to help you master O/L and A/L exams.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {!user ? (
                <>
                  <Link
                    href="/browse"
                    className="flex w-full max-w-xs items-center justify-center rounded-2xl bg-blue-600 px-8 py-5 text-xl font-black text-white shadow-2xl shadow-blue-600/40 transition-all hover:bg-blue-700 hover:-translate-y-1 active:scale-95"
                  >
                    Find Your Coach
                  </Link>
                  <Link
                    href="/signup?role=mentor"
                    className="flex w-full max-w-xs items-center justify-center rounded-2xl bg-slate-900 px-8 py-5 text-xl font-black text-white transition-all hover:bg-black hover:-translate-y-1 active:scale-95 shadow-xl"
                  >
                    Apply as a Coach
                  </Link>
                </>
              ) : role === "mentor" ? (
                <>
                  <Link
                    href="/mentor/dashboard"
                    className="flex w-full max-w-xs items-center justify-center rounded-2xl bg-blue-600 px-8 py-5 text-xl font-black text-white shadow-2xl shadow-blue-600/40 transition-all hover:bg-blue-700 hover:-translate-y-1 active:scale-95"
                  >
                    Go to Dashboard
                  </Link>
                  {mentorId && (
                    <Link
                      href={`/coach/${mentorId}`}
                      className="flex w-full max-w-xs items-center justify-center rounded-2xl bg-slate-900 px-8 py-5 text-xl font-black text-white transition-all hover:bg-black hover:-translate-y-1 active:scale-95"
                    >
                      View Your Profile
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href="/student/dashboard"
                    className="flex w-full max-w-xs items-center justify-center rounded-2xl bg-blue-600 px-8 py-5 text-xl font-black text-white shadow-2xl shadow-blue-600/40 transition-all hover:bg-blue-700 hover:-translate-y-1 active:scale-95"
                  >
                    My Dashboard
                  </Link>
                  <Link
                    href="/browse"
                    className="flex w-full max-w-xs items-center justify-center rounded-2xl bg-slate-900 px-8 py-5 text-xl font-black text-white transition-all hover:bg-black hover:-translate-y-1 active:scale-95"
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
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">How ExamCoach Works</h2>
            <p className="text-gray-500 font-medium italic">Three simple steps to academic excellence</p>
          </div>
          <div className="grid gap-12 md:grid-cols-3">
            {[
              { step: 1, icon: "🔍", title: "Find a Verified Coach", desc: "Browse coaches who got top results in the same exam you're preparing for" },
              { step: 2, icon: "💬", title: "Start Learning", desc: "Get daily chat support, voice note explanations, and a personalized study plan" },
              { step: 3, icon: "🏆", title: "Ace Your Exam", desc: "Follow your coach's proven strategies and improve your grades" }
            ].map((s) => (
              <div key={s.step} className="group relative bg-gray-50 p-8 rounded-3xl transition-all hover:bg-white hover:shadow-2xl hover:shadow-blue-600/10 border border-transparent hover:border-blue-100">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                  {s.icon}
                </div>
                <h3 className="text-xl font-black mb-3">{s.title}</h3>
                <p className="text-gray-600 leading-relaxed font-medium">{s.desc}</p>
                <span className="absolute top-8 right-8 text-6xl font-black text-blue-600/5 select-none">{s.step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: Live Stats */}
      <section className="py-20 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_50%,_#3b82f6_0%,_transparent_50%)]" />
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 relative z-10">
          {[
            { label: "Verified Coaches", value: Math.max(stats.coaches, 5) + "+", icon: "💎" },
            { label: "Students Coached", value: Math.max(stats.students, 10) + "+", icon: "🎓" },
            { label: "Messages Exchanged", value: Math.max(stats.messages, 100) + "+", icon: "💬" },
            { label: "Average Rating", value: stats.rating || "4.9", icon: "⭐" }
          ].map((s, i) => (
            <div key={i} className="text-center">
              <span className="text-4xl block mb-4">{s.icon}</span>
              <div className="text-4xl sm:text-5xl font-black text-blue-400 mb-2">{s.value}</div>
              <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">{s.label}</p>
            </div>
          ))}
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

      {/* SECTION 5: Featured Coaches */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Meet Our Top Coaches</h2>
              <p className="text-gray-500 font-medium max-w-md italic">Learn from students who have already mastered the target you are aiming for.</p>
            </div>
            <Link href="/browse" className="text-blue-600 font-black flex items-center gap-2 hover:gap-4 transition-all uppercase text-sm tracking-widest">
              View All Coaches <span>→</span>
            </Link>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {featuredCoaches.map((coach) => (
              <div key={coach.id} className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-white hover:border-blue-500/20 transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-blue-50">
                      {coach.profile_picture ? (
                        <img src={coach.profile_picture} alt={coach.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-black text-xl">
                          {coach.full_name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900">{coach.full_name}</h3>
                      <p className="text-xs text-yellow-500 font-bold">⭐ {coach.average_rating.toFixed(1)} Rating</p>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="text-lg">{coach.exam_type === 'AL' ? '🎓' : '🏆'}</span>
                    {coach.university || "O/L Top Achiever"}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-8">
                    <span className="text-[10px] font-black uppercase bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
                      {coach.subject}
                    </span>
                    <span className="text-[10px] font-black uppercase bg-slate-50 text-slate-500 px-3 py-1 rounded-full border border-slate-100 italic">
                       Verified Achiever
                    </span>
                  </div>

                  <Link 
                    href={user ? `/coach/${coach.id}` : "/signup"}
                    className="block w-full text-center bg-gray-900 text-white py-4 rounded-2xl font-black text-sm group-hover:bg-blue-600 transition-colors shadow-lg active:scale-95"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
             <span className="text-4xl mb-4 block">💬</span>
             <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Loved by Students & Parents</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { 
                text: "My son was failing Combined Maths. His coach from Moratuwa showed him exactly how to approach the paper. He got a B in his term test!", 
                author: "Mrs. Perera", 
                role: "Parent of A/L Student" 
              },
              { 
                text: "I didn't know how to study properly for O/Ls. My coach gave me a week-by-week plan and checked my past papers. I got 7As!", 
                author: "Nadeesha", 
                role: "O/L Student" 
              },
              { 
                text: "Much better than tuition classes. My coach replies to my questions within hours with voice notes. It's like having a smart aiya.", 
                author: "Kavinda", 
                role: "A/L Science Student" 
              }
            ].map((t, i) => (
              <div key={i} className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm relative italic leading-relaxed text-gray-700 font-medium">
                <span className="text-6xl absolute top-6 left-6 text-gray-100 select-none">"</span>
                <p className="relative z-10 mb-8">{t.text}</p>
                <div className="border-t border-gray-50 pt-6">
                  <p className="text-sm font-black text-gray-900 not-italic">{t.author}</p>
                  <p className="text-xs text-gray-400 not-italic font-bold uppercase tracking-widest">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-12 text-center text-gray-400 text-xs italic">* Example testimonials based on real user feedback</p>
        </div>
      </section>

      {/* SECTION 7: FAQ */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 text-center mb-16">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-black text-gray-900 italic">{faq.q}</span>
                  <span className={`text-2xl transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-gray-600 font-medium leading-relaxed">
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
              <h2 className="text-4xl sm:text-6xl font-black mb-6 tracking-tight italic">Ready to Ace Your Next Exam?</h2>
              <p className="text-xl sm:text-2xl text-blue-100 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">Join hundreds of Sri Lankan students who are already improving their grades with dedicated university mentors.</p>
              
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link 
                  href={user ? "/browse" : "/signup"}
                  className="bg-white text-blue-900 px-10 py-5 rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  Find Your Coach
                </Link>
                {!user && (
                   <Link 
                    href="/signup?role=mentor"
                    className="bg-blue-500/30 backdrop-blur-md border border-white/20 text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-blue-500/50 transition-all active:scale-95"
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

