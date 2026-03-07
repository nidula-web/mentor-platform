"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Mentor, Profile } from "@/lib/supabase";
import {
  EXAM_TYPES,
  AL_STREAMS,
  AL_STREAM_SUBJECTS,
  OL_SUBJECTS,
  LANGUAGES,
} from "@/lib/mentor-options";

type MentorWithProfile = Mentor & {
  profile: Pick<Profile, "full_name" | "profile_picture"> | null;
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
  const [filterExamType, setFilterExamType] = useState<string>("");
  const [filterStream, setFilterStream] = useState<string>("");
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [filterLanguage, setFilterLanguage] = useState<string>("");
  const [filteredMentors, setFilteredMentors] = useState<MentorWithProfile[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const subjectOptions = getSubjectOptions(filterExamType, filterStream);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: mentorsData, error } = await supabase
        .from("mentors")
        .select("*");

      console.log("Mentors found:", mentorsData);
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
      const withProfiles: MentorWithProfile[] = [];
      for (const mentor of rawMentors) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", mentor.user_id)
          .single();

        if (profileError) {
          console.log("Profile error:", profileError);
        }

        const typedProfile = (profile ?? null) as Profile | null;

        withProfiles.push({
          ...mentor,
          profile: typedProfile
            ? {
                full_name: typedProfile.full_name,
                profile_picture: typedProfile.profile_picture,
              }
            : null,
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
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-xl font-bold text-blue-700">
            MentorLK
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="mb-8 text-2xl font-bold text-gray-900 sm:text-3xl">
          Browse Mentors
        </h1>

        {/* Filters */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Refine your search
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Exam type
              </label>
              <select
                value={filterExamType}
                onChange={(e) => {
                  setFilterExamType(e.target.value);
                  setFilterStream("");
                  setFilterSubject("");
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All</option>
                {EXAM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Stream
              </label>
              <select
                value={filterStream}
                onChange={(e) => {
                  setFilterStream(e.target.value);
                  setFilterSubject("");
                }}
                disabled={filterExamType !== "A/L"}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">All</option>
                {AL_STREAMS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Subject
              </label>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All</option>
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Language
              </label>
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All</option>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleSearch}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
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
                ? "No mentors match your filters. Try different criteria."
                : "No mentors yet. Check back soon."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="p-6">
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
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold text-gray-900">
                            {mentor.profile?.full_name ?? "Mentor"}
                          </h3>
                          {mentor.is_verified && (
                            <span
                              className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800"
                              title="Verified mentor"
                            >
                              ✓ Verified
                            </span>
                          )}
                        </div>
                        {mentor.university && (
                          <p className="truncate text-sm text-gray-600">
                            {mentor.university}
                          </p>
                        )}
                        {mentor.al_stream && (
                          <p className="text-xs text-gray-500">
                            {mentor.al_stream}
                            {mentor.exam_type && ` • ${mentor.exam_type}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {mentor.subjects?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="text-xs text-gray-500">Subjects:</span>
                        {mentor.subjects.map((subject) => (
                          <span
                            key={subject}
                            className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    )}

                    {resultEntries.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
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

                    {mentor.bio && (
                      <p className="mt-3 line-clamp-3 text-sm text-gray-600">
                        {mentor.bio}
                      </p>
                    )}

                    {mentor.z_score != null && (
                      <p className="mt-2 text-sm text-gray-600">
                        Z-Score: <span className="font-medium">{mentor.z_score}</span>
                      </p>
                    )}

                    {mentor.languages?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="text-xs text-gray-500">Languages:</span>
                        {mentor.languages.map((lang) => (
                          <span
                            key={lang}
                            className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="mt-3 text-sm text-gray-500">
                      {slotsLeft} slot{slotsLeft !== 1 ? "s" : ""} left
                    </p>
                  </div>

                  <div className="mt-auto border-t border-gray-100 p-4">
                    <Link
                      href={`/subscribe/${mentor.id}`}
                      className="block w-full rounded-lg bg-blue-600 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      Subscribe
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
