"use client";
// @ts-nocheck

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Mentor, Profile } from "@/lib/supabase";
import { getPricing } from "@/lib/pricing";
import {
  EXAM_TYPES,
  AL_STREAMS,
  AL_STREAM_SUBJECTS,
  OL_SUBJECTS,
  LANGUAGES,
} from "@/lib/mentor-options";

type MentorWithProfile = Mentor & {
  profile: Pick<Profile, "full_name" | "profile_picture"> | null;
  averageRating: number | null;
  reviewCount: number;
};

function getAllSubjects(): string[] {
  const set = new Set<string>();
  OL_SUBJECTS.forEach((s) => set.add(s));
  Object.values(AL_STREAM_SUBJECTS).forEach((arr) =>
    arr.forEach((s) => set.add(s))
  );
  return Array.from(set).sort();
}

function getSubjectOptions(examType: string, stream: string): string[] {
  if (examType === "A/L") {
    return stream
      ? AL_STREAM_SUBJECTS[stream] ?? []
      : Array.from(
          new Set(
            Object.values(AL_STREAM_SUBJECTS).flat()
          )
        ).sort();
  }
  if (examType === "O/L") return [...OL_SUBJECTS];
  return getAllSubjects();
}

function DefaultAvatar({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-blue-100 text-blue-600 ${className}`}
    >
      <svg
        className="h-1/2 w-1/2"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}


export default function BrowsePage() {
  const [mentors, setMentors] = useState<MentorWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase: any = createClient();
  const [filterExamType, setFilterExamType] = useState<string>("");
  const [filterStream, setFilterStream] = useState<string>("");
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [filterLanguage, setFilterLanguage] = useState<string>("");
  const [filteredMentors, setFilteredMentors] = useState<MentorWithProfile[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewerRole, setViewerRole] = useState<string | null>(null);

  const subjectOptions = getSubjectOptions(filterExamType, filterStream);

  useEffect(() => {
    async function load() {
      const supabase: any = createClient();

      // Check user role
      const { data: { user } }: any = await supabase.auth.getUser();
        if (user) {
          const { data: profile }: any = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          
          if (profile) {
            setViewerRole(profile.role);
            if (profile.role === "mentor") {
              router.push("/mentor/dashboard");
              return;
            }
          }
        }

      const { data: mentorsData, error } = await supabase
        .from("mentors")
        .select("*")
        .eq("is_verified", true);

      if (error) {
        console.log("Error:", error);
        setLoading(false);
        return;
      }

      if (!mentorsData?.length) {
        setMentors([]);
        setLoading(false);
        return;
      }

      const rawMentors = (mentorsData ?? []) as Mentor[];
      
      // Fetch all relevant profiles and reviews in bulk if possible, or keep loop if simple
      // For now, let's stick to the loop but add review fetching
      const withProfiles: MentorWithProfile[] = [];
      for (const mentor of rawMentors) {
        // Fetch Profile
        const { data: profile }: any = await supabase
          .from("profiles")
          .select("full_name, profile_picture")
          .eq("id", mentor.user_id)
          .single();

        // Fetch Reviews
        const { data: reviews } = await (supabase
          .from("reviews"))
          .select("rating")
          .eq("mentor_id", mentor.id);

        let averageRating = null;
        let reviewCount = 0;

        if (reviews && reviews.length > 0) {
          reviewCount = reviews.length;
          const sum = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
          averageRating = sum / reviewCount;
        }

        withProfiles.push({
          ...mentor,
          profile: profile as any,
          averageRating,
          reviewCount,
        });
      }

      setMentors(withProfiles);
      setFilteredMentors(withProfiles);
      setLoading(false);
    }
    load();
  }, []);

  function handleSearch() {
    setHasSearched(true);
    let result = mentors;

    if (filterExamType) {
      result = result.filter((m) => m.exam_type === filterExamType);
    }
    if (filterStream) {
      result = result.filter((m) => m.al_stream === filterStream);
    }
    if (filterSubject) {
      result = result.filter(
        (m) => Array.isArray(m.subjects) && m.subjects.includes(filterSubject)
      );
    }
    if (filterLanguage) {
      result = result.filter(
        (m) =>
          Array.isArray(m.languages) && m.languages.includes(filterLanguage)
      );
    }

    setFilteredMentors(result);
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="mx-auto max-w-7xl px-4 py-8 pt-24 sm:px-6">
        <h1 className="mb-8 text-2xl font-bold text-gray-900 sm:text-3xl">
          Browse Coaches
        </h1>

        {/* Filters */}
        {/* Mobile Filter Toggle */}
        <div className="mb-4 lg:hidden">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 py-3.5 font-bold text-gray-900 shadow-sm active:scale-95 transition-all"
          >
            <span>{isFilterOpen ? "✕ Close Filters" : "🔍 Filter Coaches"}</span>
          </button>
        </div>

        {/* Filters */}
        <div className={`mb-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 transition-all duration-300 ${isFilterOpen ? 'block' : 'hidden lg:block'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">
              Refine your search
            </h2>
            <button 
              onClick={() => {
                setFilterExamType("");
                setFilterStream("");
                setFilterSubject("");
                setFilterLanguage("");
                setFilteredMentors(mentors);
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-tight text-gray-500">
                Exam type
              </label>
              <select
                value={filterExamType}
                onChange={(e) => {
                  setFilterExamType(e.target.value);
                  setFilterStream("");
                  setFilterSubject("");
                }}
                className="w-full h-[48px] rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="">All Exams</option>
                {EXAM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-tight text-gray-500">
                Stream
              </label>
              <select
                value={filterStream}
                onChange={(e) => {
                  setFilterStream(e.target.value);
                  setFilterSubject("");
                }}
                disabled={filterExamType !== "A/L"}
                className="w-full h-[48px] rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-all"
              >
                <option value="">All Streams</option>
                {AL_STREAMS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-tight text-gray-500">
                Subject
              </label>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full h-[48px] rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="">All Subjects</option>
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-tight text-gray-500">
                Language
              </label>
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="w-full h-[48px] rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="">All Languages</option>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  handleSearch();
                  setIsFilterOpen(false);
                }}
                className="w-full h-[48px] rounded-xl bg-gray-900 px-4 font-black mt-2 text-white hover:bg-black active:scale-95 transition-all shadow-lg"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
            <p className="text-gray-600">
              {hasSearched
                ? "No coaches match your filters. Try different criteria."
                : "No coaches yet. Check back soon."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMentors.map((mentor) => {
              const results = mentor.results as Record<string, string> | null;
              const resultEntries = results
                ? Object.entries(results).filter(
                    ([k]) =>
                      k !== "result_sheet_url" &&
                      typeof results[k] === "string"
                  )
                : [];
              const slotsLeft =
                mentor.max_students - mentor.current_student_count;

              return (
                <article
                  key={mentor.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
                >
                  <Link href={`/coach/${mentor.id}`} className="flex-1 p-6">
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <h3 className="truncate font-bold text-gray-900 group-hover:text-blue-600">
                            {mentor.profile?.full_name ?? "Coach"}
                          </h3>
                          {mentor.is_verified && (
                            <span
                              className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800"
                              title="Verified coach"
                            >
                              ✓ Verified
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-sm mb-1">
                          <span className="text-yellow-500 font-bold">
                            ⭐ {mentor.averageRating ? mentor.averageRating.toFixed(1) : "New Coach"}
                          </span>
                          {mentor.reviewCount > 0 && (
                            <span className="text-gray-500 text-xs">
                              ({mentor.reviewCount} review{mentor.reviewCount !== 1 ? 's' : ''})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                          <span>📋 {mentor.exam_type} {mentor.exam_year || mentor.results?.exam_year || 'N/A'}</span>
                          <span className="text-gray-300">|</span>
                          <span>Index: {mentor.index_number || '******'}</span>
                        </div>
                      </div>
                    </div>
 
                    <div className="mt-4">
                      {mentor.exam_type === "A/L" ? (
                        mentor.university && (
                          <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-2">
                            <span className="text-blue-600 text-lg">🎓</span> {mentor.university}
                          </p>
                        )
                      ) : (
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-2">
                          <span className="text-green-600 text-lg">🏆</span> O/L Achiever
                        </p>
                      )}

                      {mentor.subjects?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {mentor.subjects.map((subject) => (
                            <span
                              key={subject}
                              className="rounded-md bg-gray-50 border border-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
                            >
                              {subject}
                            </span>
                          ))}
                        </div>
                      )}

                      {resultEntries.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
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
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${gradeColor}`}
                              >
                                {subject}: {grade}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {mentor.bio && (
                        <p className="mt-3 line-clamp-2 text-xs text-gray-600 leading-relaxed">
                          {mentor.bio}
                        </p>
                      )}

                      {/* Price & View Profile Button */}
                      <div className="mt-8">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold text-gray-400 uppercase tracking-tighter">Subscription</p>
                          {viewerRole === 'student' ? (
                            <p className="text-lg font-black text-gray-900">
                                Rs. {getPricing(mentor.exam_type).studentPays.toLocaleString()}
                                <span className="text-xs font-medium text-gray-500">/mo</span>
                            </p>
                          ) : (
                            <p className="text-xs font-bold text-gray-400 italic">Sign up to see pricing</p>
                          )}
                        </div>
                        <div className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-sm shadow-xl shadow-blue-600/20 group-hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center">
                          View Profile
                        </div>
                      </div>

                      <p className="mt-4 text-center text-xs text-gray-400 font-medium">
                        {mentor.current_student_count >= mentor.max_students ? (
                          <span className="text-red-600 font-bold">🔴 Fully Booked</span>
                        ) : (
                          `🟢 ${mentor.max_students - (mentor.current_student_count || 0)} slots available`
                        )}
                      </p>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

