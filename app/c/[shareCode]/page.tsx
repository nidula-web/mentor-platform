
// @ts-nocheck
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Metadata } from "next";

async function getCoachData(shareCode: string) {
  const supabase: any = createClient();
  const { data: mentor, error } = await supabase
    .from("mentors")
    .select("*, profiles(*)")
    .eq("share_code", shareCode)
    .single();

  if (error || !mentor) return null;
  return mentor;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareCode: string }>;
}): Promise<Metadata> {
  const { shareCode } = await params;
  const mentor = await getCoachData(shareCode);
  if (!mentor) {
    return {
      title: "Coach Not Found | ExamCoach",
    };
  }

  const name = mentor.profiles.full_name;
  const university = mentor.university || "ExamCoach";
  const profilePic = mentor.profiles.profile_picture;
  const examType = mentor.exam_type;

  return {
    title: `${name} - Your Personal Exam Coach | ExamCoach`,
    description: `${name} from ${university} is ready to help you ace your ${examType} exams. Join ExamCoach now!`,
    openGraph: {
      title: `${name} | ExamCoach`,
      description: "Get mentored by a verified top achiever",
      images: profilePic ? [profilePic] : [],
      type: "profile",
      siteName: "ExamCoach",
    },
  };
}

export default async function CoachSharePage({
  params,
}: {
  params: Promise<{ shareCode: string }>;
}) {
  const { shareCode } = await params;
  const mentor = await getCoachData(shareCode);

  if (!mentor) {
    redirect("/browse");
  }

  const supabase: any = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in as the coach themselves
  if (user && user.id === mentor.user_id) {
    redirect(`/coach/${mentor.id}`);
  }

  const isStudent = !!user;
  const initials = mentor.profiles.full_name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  // Fetch rating stats
  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("mentor_id", mentor.id);

  const reviewCount = reviews?.length || 0;
  const avgRating = reviewCount
    ? Math.round((reviews!.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0) / reviewCount) * 10) / 10
    : 0;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-blue-100">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-purple-50 opacity-70" />
      
      {/* Header / Logo */}
      <header className="mx-auto flex max-w-lg items-center justify-center py-8">
        <Link href="/" className="group flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition-transform group-hover:scale-105 active:scale-95">
            <span className="text-xl font-black italic">E</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-gray-900">
            Exam<span className="text-blue-600">Coach</span>
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-xl px-6 pb-20 pt-4">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Profile Section */}
          <div className="relative mb-10 flex flex-col items-center text-center">
            {/* Profile Picture */}
            <div className="group relative mb-6">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 opacity-20 blur transition duration-500 group-hover:opacity-40" />
              {mentor.profiles.profile_picture ? (
                <img
                  src={mentor.profiles.profile_picture}
                  alt={mentor.profiles.full_name}
                  className="relative h-36 w-36 rounded-full border-4 border-white object-cover shadow-2xl"
                />
              ) : (
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-white bg-blue-50 text-4xl font-bold text-blue-600 shadow-2xl">
                  {initials}
                </div>
              )}
              {mentor.is_verified && (
                <div className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-green-500 text-white shadow-lg">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            <h1 className="mb-1 text-3xl font-black tracking-tight text-gray-900">
              {mentor.profiles.full_name}
            </h1>
            <p className="mb-3 text-lg font-medium text-blue-600">
              Your Personal Exam Coach
            </p>
            
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-gray-100 backdrop-blur-sm">
                {mentor.exam_type === "A/L" ? (
                  <>
                    <span>🎓</span>
                    <span>{mentor.university}</span>
                  </>
                ) : (
                  <>
                    <span>🏆</span>
                    <span>O/L Achiever</span>
                  </>
                )}
              </div>
              {reviewCount > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-bold text-amber-700 shadow-sm ring-1 ring-amber-100">
                  <span>⭐</span>
                  <span>{avgRating}</span>
                  <span className="text-xs font-medium opacity-60">({reviewCount})</span>
                </div>
              )}
            </div>

            {/* Subjects Grid */}
            <div className="mb-8 flex flex-wrap justify-center gap-2">
              {mentor.subjects.map((subject: string) => {
                const grade = mentor.results?.[subject] || 'A';
                return (
                  <div
                    key={subject}
                    className="group flex items-center gap-2 rounded-xl bg-white p-2 pr-4 shadow-sm ring-1 ring-gray-100 transition-all hover:scale-105 active:scale-95"
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-black text-white ${
                      grade === 'A' ? 'bg-green-500' : grade === 'B' ? 'bg-blue-500' : 'bg-orange-500'
                    }`}>
                      {grade}
                    </div>
                    <span className="text-sm font-bold text-gray-700">{subject}</span>
                  </div>
                );
              })}
            </div>

            {/* Bio */}
            <div className="mb-10 w-full rounded-3xl bg-white/40 p-8 text-left ring-1 ring-gray-100 backdrop-blur-md">
              <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-gray-400">
                About the Coach
              </h3>
              <p className="text-lg leading-relaxed text-gray-600">
                {mentor.bio}
              </p>
            </div>

            {/* CTA section */}
            <div className="w-full space-y-4">
              {isStudent ? (
                <Link
                  href={`/coach/${mentor.id}`}
                  className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-8 py-4 text-lg font-black text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-blue-700 active:scale-95"
                >
                  View Full Profile
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-8 py-4 text-lg font-black text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-blue-700 active:scale-95"
                >
                  Get Started
                </Link>
              )}
              <p className="text-sm font-medium text-gray-500">
                Join ExamCoach to connect with {mentor.profiles.full_name}
              </p>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 flex flex-wrap justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-gray-400">Verified Results</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-gray-400">Safe Platform</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-gray-400">1-on-1 Chat</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
