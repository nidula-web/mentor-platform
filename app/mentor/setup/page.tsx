"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  EXAM_TYPES,
  AL_STREAMS,
  AL_STREAM_SUBJECTS,
  OL_SUBJECTS,
  GRADES,
  LANGUAGES,
} from "@/lib/mentor-options";

const STEPS = 3;

export default function MentorSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1 - Exam Info
  const [examType, setExamType] = useState<"O/L" | "A/L">("A/L");
  const [indexNumber, setIndexNumber] = useState("");
  const [examYear, setExamYear] = useState("");
  const [alStream, setAlStream] = useState("Physical Science");
  const [subjectGrades, setSubjectGrades] = useState<Record<string, string>>({});

  const EXAM_YEARS = Array.from({ length: 11 }, (_, i) => 2015 + i).reverse();

  // Step 2 - University Info
  const [university, setUniversity] = useState("");
  const [degreeProgram, setDegreeProgram] = useState("");
  const [zScore, setZScore] = useState("");
  const [resultSheetFile, setResultSheetFile] = useState<File | null>(null);

  // Step 3 - Profile
  const [bio, setBio] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [maxStudents, setMaxStudents] = useState(10);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);

  const subjects =
    examType === "A/L" && alStream
      ? AL_STREAM_SUBJECTS[alStream] ?? []
      : examType === "O/L"
        ? OL_SUBJECTS
        : [];

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/login");
      else setUserId(user.id);
    });
  }, [router]);

  useEffect(() => {
    if (examType === "A/L" && !AL_STREAMS.includes(alStream as (typeof AL_STREAMS)[number])) {
      setAlStream(AL_STREAMS[0]);
    }
    if (examType === "O/L") setAlStream("");
    setSubjectGrades({});
  }, [examType, alStream]);

  function toggleLanguage(lang: string) {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  }

  function setGrade(subject: string, grade: string) {
    setSubjectGrades((prev) => ({ ...prev, [subject]: grade }));
  }

  async function uploadFile(
    supabase: ReturnType<typeof createClient>,
    file: File,
    path: string
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from("profile-pictures")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-pictures").getPublicUrl(data.path);
    return publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!userId) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    let resultSheetUrl: string | null = null;
    let profilePictureUrl: string | null = null;

    try {
      if (resultSheetFile) {
        resultSheetUrl = await uploadFile(
          supabase,
          resultSheetFile,
          `${userId}/result-sheet-${Date.now()}`
        );
      }
      if (profilePictureFile) {
        profilePictureUrl = await uploadFile(
          supabase,
          profilePictureFile,
          `${userId}/profile-${Date.now()}`
        );
      }
    } catch (uploadErr) {
      setError(uploadErr instanceof Error ? uploadErr.message : "File upload failed.");
      setLoading(false);
      return;
    }

    const results: Record<string, unknown> = { ...subjectGrades };
    if (resultSheetUrl) results.result_sheet_url = resultSheetUrl;

    const { error: insertError } = await supabase.from("mentors").insert({
      user_id: userId,
      exam_type: examType,
      al_stream: examType === "A/L" ? alStream : null,
      index_number: indexNumber.trim() || null,
      exam_year: examYear ? parseInt(examYear, 10) : null,
      subjects: Object.keys(subjectGrades),
      results,
      university: university || null,
      degree_program: degreeProgram || null,
      z_score: zScore ? parseFloat(zScore) : null,
      bio: bio || null,
      languages: selectedLanguages,
      is_verified: false,
      max_students: maxStudents,
      current_student_count: 0,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    if (profilePictureUrl) {
      await supabase
        .from("profiles")
        .update({ profile_picture: profilePictureUrl })
        .eq("id", userId);
    }

    router.push("/mentor/dashboard");
    setLoading(false);
  }

  function nextStep() {
    if (step === 1) {
      if (!indexNumber.trim()) {
        setError("Please enter your exam index number.");
        return;
      }
      if (!examYear) {
        setError("Please select the year you sat for the exam.");
        return;
      }
      setError(null);
    }
    if (step < STEPS) setStep(step + 1);
  }

  function prevStep() {
    if (step > 1) setStep(step - 1);
  }

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-bold text-blue-700">
            MentorLK
          </Link>
        </div>

        {/* Progress bar */}
        <div className="mb-10">
          <div className="mb-2 flex justify-between text-sm font-medium text-gray-600">
            <span>Step {step} of {STEPS}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(step / STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit}>
            {/* Step 1 - Exam Info */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Exam Information</h2>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Exam Type
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as "O/L" | "A/L")}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="indexNumber" className="mb-2 block text-sm font-medium text-gray-700">
                    Your O/L or A/L Exam Index Number
                  </label>
                  <input
                    id="indexNumber"
                    type="text"
                    value={indexNumber}
                    onChange={(e) => setIndexNumber(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., 1234567"
                  />
                </div>

                <div>
                  <label htmlFor="examYear" className="mb-2 block text-sm font-medium text-gray-700">
                    Year you sat for the exam
                  </label>
                  <select
                    id="examYear"
                    value={examYear}
                    onChange={(e) => setExamYear(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select year</option>
                    {EXAM_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {examType === "A/L" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Stream
                    </label>
                    <select
                      value={alStream}
                      onChange={(e) => setAlStream(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {AL_STREAMS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-700">
                    Subjects & Grades
                  </label>
                  <div className="space-y-3">
                    {subjects.map((subject) => (
                      <div
                        key={subject}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                      >
                        <label className="flex flex-1 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={subject in subjectGrades}
                            onChange={(e) => {
                              if (e.target.checked) setGrade(subject, "A");
                              else
                                setSubjectGrades((p) => {
                                  const next = { ...p };
                                  delete next[subject];
                                  return next;
                                });
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{subject}</span>
                        </label>
                        {subject in subjectGrades && (
                          <select
                            value={subjectGrades[subject]}
                            onChange={(e) => setGrade(subject, e.target.value)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {GRADES.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                  {subjects.length === 0 && (
                    <p className="text-sm text-gray-500">
                      {examType === "A/L"
                        ? "Select a stream to see subjects."
                        : "O/L subjects are listed above."}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2 - University Info */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">University Information</h2>

                <div>
                  <label htmlFor="university" className="mb-1 block text-sm font-medium text-gray-700">
                    University Name
                  </label>
                  <input
                    id="university"
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. University of Colombo"
                  />
                </div>

                <div>
                  <label htmlFor="degreeProgram" className="mb-1 block text-sm font-medium text-gray-700">
                    Degree Program
                  </label>
                  <input
                    id="degreeProgram"
                    type="text"
                    value={degreeProgram}
                    onChange={(e) => setDegreeProgram(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. BSc Computer Science"
                  />
                </div>

                <div>
                  <label htmlFor="zScore" className="mb-1 block text-sm font-medium text-gray-700">
                    Z-Score
                  </label>
                  <input
                    id="zScore"
                    type="number"
                    step="0.01"
                    value={zScore}
                    onChange={(e) => setZScore(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. 1.85"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Result Sheet Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setResultSheetFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
            )}

            {/* Step 3 - Profile */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Profile</h2>

                <div>
                  <label htmlFor="bio" className="mb-1 block text-sm font-medium text-gray-700">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Tell students about yourself, your strengths, and how you can help..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Languages
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {LANGUAGES.map((lang) => (
                      <label
                        key={lang}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 transition-colors hover:bg-gray-100"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLanguages.includes(lang)}
                          onChange={() => toggleLanguage(lang)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">{lang}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="maxStudents" className="mb-1 block text-sm font-medium text-gray-700">
                    Max Students You Can Handle
                  </label>
                  <input
                    id="maxStudents"
                    type="number"
                    min={1}
                    max={50}
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(parseInt(e.target.value, 10) || 10)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Profile Picture
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfilePictureFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                Back
              </button>
              {step < STEPS ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Complete Setup"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
