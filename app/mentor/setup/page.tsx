"use client";
// @ts-nocheck

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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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
    const supabase: any = createClient();
    supabase.auth.getUser().then(({ data: { user } }: any) => {
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

  const isStep1Valid = 
    indexNumber.trim().length > 0 && 
    examYear !== "" && 
    (examType === "O/L" ? Object.keys(subjectGrades).length >= 3 : Object.keys(subjectGrades).length >= 1);

  const isStep2Valid = 
    examType === "O/L" 
      ? true
      : (university.trim().length > 0 && 
         degreeProgram.trim().length > 0 && 
         zScore.trim().length > 0);

  const isStep3Valid = 
    bio.trim().length >= 50 && 
    selectedLanguages.length >= 1;

  const isFormValid = isStep1Valid && isStep2Valid && isStep3Valid;

  function markTouched(name: string) {
    setTouched(prev => ({ ...prev, [name]: true }));
  }

  function getFieldStatus(name: string, value: any, isValid: boolean) {
    if (!touched[name]) return "border-gray-300";
    return isValid ? "border-green-500 bg-green-50/10" : "border-red-500 bg-red-50/10";
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

    if (!isFormValid) {
      setError("Please fill all required fields correctly.");
      return;
    }

    setLoading(true);

    if (!userId) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const supabase: any = createClient();

    let profilePictureUrl: string | null = null;

    try {
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

    const { error: insertError } = await supabase.from("mentors").insert({
      user_id: userId,
      exam_type: examType,
      al_stream: examType === "A/L" ? alStream : null,
      index_number: indexNumber.trim() || null,
      exam_year: examYear ? parseInt(examYear, 10) : null,
      subjects: Object.keys(subjectGrades),
      results,
      university: examType === "A/L" ? university : null,
      degree_program: examType === "A/L" ? degreeProgram : null,
      z_score: examType === "A/L" ? (zScore ? parseFloat(zScore) : null) : null,
      bio: bio || null,
      languages: selectedLanguages,
      is_verified: false,
      max_students: maxStudents,
      current_student_count: 0,
      share_code: Math.random().toString(36).substring(2, 10),
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

    router.push("/mentor/pending");
    setLoading(false);
  }

  function nextStep() {
    if (step === 1 && !isStep1Valid) {
      setError("Please fill all required fields in Step 1.");
      setTouched({ indexNumber: true, examYear: true, alStream: true, subjects: true });
      return;
    }
    if (step === 2 && !isStep2Valid) {
      setError("Please fill all required fields in Step 2.");
      setTouched(prev => ({ ...prev, university: true, degreeProgram: true, zScore: true }));
      return;
    }
    setError(null);
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
            ExamCoach
          </Link>
        </div>

        {/* Progress bar */}
        <div className="mb-10">
          <div className="mb-2 flex justify-between text-sm font-medium text-gray-600">
            <span>Step {step} of {STEPS}</span>
            <span className="text-blue-600 font-bold">{Math.round((step / STEPS) * 100)}% Complete</span>
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
          <form onSubmit={handleSubmit} noValidate>
            {/* Step 1 - Exam Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Exam Information</h2>
                  <p className="text-sm text-gray-500 mt-1">Tell us about your expert exam results.</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-800">
                    Exam Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {EXAM_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setExamType(t as any)}
                        className={`py-3 px-4 rounded-xl border-2 transition-all font-semibold ${
                          examType === t 
                            ? "border-blue-600 bg-blue-50 text-blue-700" 
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="indexNumber" className="mb-2 block text-sm font-bold text-gray-800">
                    Exam Index Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="indexNumber"
                    type="text"
                    value={indexNumber}
                    onChange={(e) => setIndexNumber(e.target.value)}
                    onBlur={() => markTouched("indexNumber")}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-gray-900 transition-all focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                      getFieldStatus("indexNumber", indexNumber, indexNumber.trim().length > 0)
                    }`}
                    placeholder="e.g., 1234567"
                  />
                  {touched.indexNumber && !indexNumber.trim() && (
                    <p className="mt-1 text-xs text-red-600 font-medium italic">Index number is required for verification.</p>
                  )}
                </div>

                <div>
                  <label htmlFor="examYear" className="mb-2 block text-sm font-bold text-gray-800">
                    Exam Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="examYear"
                    value={examYear}
                    onChange={(e) => setExamYear(e.target.value)}
                    onBlur={() => markTouched("examYear")}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-gray-900 bg-white transition-all focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                      getFieldStatus("examYear", examYear, examYear !== "")
                    }`}
                  >
                    <option value="">Select year</option>
                    {EXAM_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {examType === "A/L" && (
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-800">
                      Stream <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={alStream}
                      onChange={(e) => setAlStream(e.target.value)}
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 bg-white focus:outline-none focus:border-blue-500"
                    >
                      {AL_STREAMS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                  <label className="mb-3 block text-sm font-bold text-gray-800">
                    Subjects & Grades <span className="text-red-500">*</span>
                    <span className="ml-2 font-normal text-xs text-gray-400">
                      (Select at least {examType === "O/L" ? "3" : "1"})
                    </span>
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {subjects.map((subject) => (
                      <div
                        key={subject}
                        className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                          subject in subjectGrades ? "border-blue-200 bg-blue-50/30" : "border-gray-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          id={`subject-${subject}`}
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
                          className="h-5 w-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`subject-${subject}`} className="flex-1 text-sm font-medium text-gray-700 cursor-pointer">{subject}</label>
                        {subject in subjectGrades && (
                          <select
                            value={subjectGrades[subject]}
                            onChange={(e) => setGrade(subject, e.target.value)}
                            className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-bold bg-white focus:outline-none"
                          >
                            {GRADES.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                  {Object.keys(subjectGrades).length === 0 && touched.subjects && (
                    <p className="mt-2 text-xs text-red-600 font-medium italic">Please select at least one subject.</p>
                  )}
                </div>
            )}

            {/* Step 2 - Details & Verification */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {examType === "A/L" ? "University Details" : "Verification Documents"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {examType === "A/L" ? "Show students where you study now." : "Verify your O/L success to build trust."}
                  </p>
                </div>

                {examType === "A/L" && (
                  <>
                    <div>
                      <label htmlFor="university" className="mb-2 block text-sm font-bold text-gray-800">
                        University Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="university"
                        type="text"
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        onBlur={() => markTouched("university")}
                        className={`w-full rounded-xl border-2 px-4 py-3 transition-all focus:outline-none ${
                            getFieldStatus("university", university, university.trim().length > 0)
                        }`}
                        placeholder="e.g. University of Colombo"
                      />
                    </div>

                    <div>
                      <label htmlFor="degreeProgram" className="mb-2 block text-sm font-bold text-gray-800">
                        Degree Program <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="degreeProgram"
                        type="text"
                        value={degreeProgram}
                        onChange={(e) => setDegreeProgram(e.target.value)}
                        onBlur={() => markTouched("degreeProgram")}
                        className={`w-full rounded-xl border-2 px-4 py-3 transition-all focus:outline-none ${
                            getFieldStatus("degreeProgram", degreeProgram, degreeProgram.trim().length > 0)
                        }`}
                        placeholder="e.g. BSc Computer Science"
                      />
                    </div>

                    <div>
                      <label htmlFor="zScore" className="mb-2 block text-sm font-bold text-gray-800">
                        Z-Score <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="zScore"
                        type="number"
                        step="0.01"
                        value={zScore}
                        onChange={(e) => setZScore(e.target.value)}
                        onBlur={() => markTouched("zScore")}
                        className={`w-full rounded-xl border-2 px-4 py-3 transition-all focus:outline-none ${
                            getFieldStatus("zScore", zScore, zScore.trim().length > 0)
                        }`}
                        placeholder="e.g. 1.85"
                      />
                    </div>
                  </>
                )}

              </div>
            )}

            {/* Step 3 - Profile */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Your Public Profile</h2>
                  <p className="text-sm text-gray-500 mt-1">This is what students will see.</p>
                </div>

                <div>
                  <label htmlFor="bio" className="mb-2 block text-sm font-bold text-gray-800">
                    Personal Bio <span className="text-red-500">*</span>
                    <span className={`ml-2 font-normal text-xs ${bio.trim().length >= 50 ? "text-green-600" : "text-gray-400"}`}>
                        ({bio.trim().length}/50 min characters)
                    </span>
                  </label>
                  <textarea
                    id="bio"
                    rows={6}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    onBlur={() => markTouched("bio")}
                    className={`w-full rounded-xl border-2 px-4 py-3 transition-all focus:outline-none ${
                        getFieldStatus("bio", bio, bio.trim().length >= 50)
                    }`}
                    placeholder="Tell students about your teaching style, strengths, and experience..."
                  />
                  {touched.bio && bio.trim().length < 50 && (
                    <p className="mt-1 text-xs text-red-600 font-medium italic">Please write at least 50 characters to build trust.</p>
                  )}
                </div>

                <div>
                  <label className="mb-3 block text-sm font-bold text-gray-800">
                    Languages Spoken <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-all border-2 ${
                          selectedLanguages.includes(lang)
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                  {touched.languages && selectedLanguages.length === 0 && (
                    <p className="mt-2 text-xs text-red-600 font-medium italic">Must select at least 1 language.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="mb-2 block text-sm font-bold text-gray-800">Profile Picture</label>
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                                {profilePictureFile ? (
                                    <img src={URL.createObjectURL(profilePictureFile)} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl text-gray-300">👤</span>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setProfilePictureFile(e.target.files?.[0] ?? null)}
                                className="text-sm file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-black file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                    </div>

                    <div>
                      <label htmlFor="maxStudents" className="mb-2 block text-sm font-bold text-gray-800">
                        Maximum Students You Can Handle <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="maxStudents"
                        value={maxStudents}
                        onChange={(e) => setMaxStudents(parseInt(e.target.value))}
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 bg-white focus:outline-none focus:border-blue-500"
                      >
                        {[5, 10, 15, 20, 25, 30, 40, 50].map((num) => (
                          <option key={num} value={num}>{num} students</option>
                        ))}
                      </select>
                      <p className="mt-1.5 text-xs text-gray-500">
                        Choose how many students you can mentor at once. You can change this later.
                      </p>
                    </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-8 rounded-xl bg-red-50 p-4 border border-red-100 flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <p className="text-sm text-red-700 font-bold">{error}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-10 flex gap-4">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1}
                className="flex-1 rounded-xl bg-gray-50 border-2 border-gray-200 px-4 py-4 text-sm font-bold text-gray-600 transition-all hover:bg-gray-100 disabled:opacity-0"
              >
                Previous Step
              </button>
              {step < STEPS ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={step === 1 ? !isStep1Valid : step === 2 ? !isStep2Valid : false}
                  className="flex-[2] rounded-xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95 disabled:bg-gray-200 disabled:shadow-none"
                >
                  Continue to Step {step + 1}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="flex-[2] rounded-xl bg-green-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-green-600/20 transition-all hover:bg-green-700 active:scale-95 disabled:opacity-60 disabled:shadow-none"
                >
                  {loading ? "Publishing Profile..." : "Complete Setup & Go Online"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


