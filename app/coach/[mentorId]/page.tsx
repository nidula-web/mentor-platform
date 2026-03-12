'use client'
// @ts-nocheck

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Mentor, Profile } from '@/lib/supabase'
import { getPricing } from '@/lib/pricing'

type ReviewWithStudent = {
    id: string
    rating: number
    comment: string
    created_at: string
    student_id: string
    student_profile?: {
        full_name: string
    }
}

export default function CoachProfilePage() {
    const params = useParams()
    const router = useRouter()
    const mentorId = params.mentorId as string
    const supabase: any = createClient()

    const [mentor, setMentor] = useState<(Mentor & { profile: Profile }) | null>(null)
    const [reviews, setReviews] = useState<ReviewWithStudent[]>([])
    const [loading, setLoading] = useState(true)
    const [averageRating, setAverageRating] = useState<number | null>(null)
    const [isOwner, setIsOwner] = useState(false)
    const [viewerRole, setViewerRole] = useState<string | null>(null)
    const [activeStudents, setActiveStudents] = useState(0)

    useEffect(() => {
        loadData()
    }, [mentorId])

    async function loadData() {
        setLoading(true)
        
        // Fetch current user
        const { data: { user } } = await supabase.auth.getUser()

        // Fetch Mentor and Profile
        const { data: mentorData, error: mentorError } = await supabase
            .from('mentors')
            .select('*, profiles(*)')
            .eq('id', mentorId)
            .single()

        if (mentorError || !mentorData) {
            console.error('Error fetching mentor:', mentorError)
            setLoading(false)
            return
        }

        // Check ownership & role
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            
            if (profile) setViewerRole(profile.role)

            if (user.id === mentorData.user_id) {
                setIsOwner(true)
                
                // Fetch active students if owner
                const { count } = await supabase
                    .from('subscriptions')
                    .select('*', { count: 'exact', head: true })
                    .eq('mentor_id', mentorId)
                    .eq('status', 'active')
                
                setActiveStudents(count || 0)
            }
        }

        // Handle the joined data format from Supabase
        const profile = mentorData.profiles as unknown as Profile
        const typedMentor = { ...mentorData, profile } as (Mentor & { profile: Profile })
        setMentor(typedMentor)

        // Fetch Reviews and Student Profiles
        const { data: reviewsData, error: reviewsError } = await (supabase
            .from('reviews'))
            .select(`
                id,
                rating,
                comment,
                created_at,
                student_id
            `)
            .eq('mentor_id', mentorId)
            .order('created_at', { ascending: false })

        if (reviewsData) {
            const reviewsWithProfiles: ReviewWithStudent[] = []
            let sum = 0

            for (const review of reviewsData) {
                const { data: studentProfile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', review.student_id)
                    .single()
                
                reviewsWithProfiles.push({
                    ...review,
                    student_profile: studentProfile as any
                })
                sum += review.rating
            }

            setReviews(reviewsWithProfiles)
            if (reviewsData.length > 0) {
                setAverageRating(sum / reviewsData.length)
            }
        }

        setLoading(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
        )
    }

    if (!mentor) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Coach Not Found</h1>
                <Link href="/browse" className="text-blue-600 hover:underline">Back to Browse</Link>
            </div>
        )
    }

    const initials = mentor.profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)

    const resultEntries = mentor.results 
        ? Object.entries(mentor.results as Record<string, string>).filter(([k]) => k !== 'result_sheet_url' && k !== 'exam_year')
        : []

    const pricing = getPricing(mentor.exam_type)

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                        Back
                    </button>
                    <h1 className="font-bold text-gray-900">Coach Profile</h1>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                    <div className="bg-blue-600 h-32 relative">
                        {mentor.is_verified && (
                            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-1.5 border border-white/30">
                                <span>Verified Coach</span>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                            </div>
                        )}
                        {isOwner && (
                            <div className="absolute top-4 left-4 bg-gray-900/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-1.5 border border-white/20">
                                <span>Previewing your profile</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="px-6 pb-8 relative">
                        <div className="absolute -top-12 left-6">
                            {mentor.profile.profile_picture ? (
                                <img src={mentor.profile.profile_picture} alt="" className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg" />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold border-4 border-white shadow-lg">
                                    {initials}
                                </div>
                            )}
                        </div>

                        <div className="pt-16">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">{mentor.profile.full_name}</h2>
                            <p className="text-gray-600 font-medium mb-4 flex items-center gap-2 text-lg">
                                {mentor.exam_type === "A/L" ? (
                                    <>
                                        <span className="text-blue-600">🎓</span> {mentor.university}
                                    </>
                                ) : (
                                    <>
                                        <span className="text-green-600">🏆</span> O/L Achiever
                                    </>
                                )}
                            </p>
 
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{mentor.exam_type} Credentials</h3>
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Exam Year</span>
                                            <span className="font-bold text-gray-900">{mentor.exam_year || mentor.results?.exam_year || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Index Number</span>
                                            <span className="font-bold text-gray-900 font-mono tracking-wider">{mentor.index_number || '1234567'}</span>
                                        </div>
                                        {mentor.exam_type === "A/L" && (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Z-Score</span>
                                                    <span className="font-bold text-blue-600">{mentor.z_score || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Stream</span>
                                                    <span className="font-bold text-gray-900">{mentor.al_stream}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Academic Performance</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {resultEntries.map(([subject, grade]) => (
                                            <div key={subject} className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-3 shadow-sm">
                                                <span className="text-sm font-medium text-gray-700">{subject}</span>
                                                <span className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-white text-sm
                                                    ${grade === 'A' ? 'bg-green-600' : grade === 'B' ? 'bg-blue-600' : grade === 'C' ? 'bg-yellow-500' : 'bg-gray-600'}`}>
                                                    {grade}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">About Coach</h3>
                                <p className="text-gray-600 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                                    {mentor.bio || "This coach hasn't added a bio yet."}
                                </p>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Languages</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {mentor.languages?.map(lang => (
                                            <span key={lang} className="bg-white border rounded-full px-3 py-1 text-xs font-semibold text-gray-600">{lang}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rating & Reviews Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Student Reviews</h2>
                        <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-200">
                           <span className="text-yellow-600 font-bold text-lg">⭐ {averageRating ? averageRating.toFixed(1) : 'New'}</span>
                           <span className="text-yellow-700 text-xs font-medium">({reviews.length} reviews)</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {reviews.length === 0 ? (
                            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
                                <p className="text-gray-500">No reviews yet for this coach.</p>
                            </div>
                        ) : (
                            reviews.map(review => (
                                <div key={review.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-transform hover:scale-[1.01]">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{review.student_profile?.full_name || 'Anonymous Student'}</p>
                                                <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex text-yellow-500">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={i < review.rating ? 'opacity-100' : 'opacity-20'}>★</span>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed italic">"{review.comment}"</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Sticky bottom CTA / Stats */}
            <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-4 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    {isOwner ? (
                        <>
                            <div className="flex w-full sm:w-auto justify-between sm:gap-8">
                                <div>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Active Students</p>
                                    <p className="text-xl font-black text-gray-900 leading-none mt-1">👥 {activeStudents}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Monthly Earnings</p>
                                    <p className="text-xl font-black text-blue-600 leading-none mt-1">Rs. {(activeStudents * pricing.coachEarns).toLocaleString()}</p>
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Revenue Share</p>
                                    <p className="text-xs font-semibold text-gray-600 mt-1">💰 Rs. {pricing.coachEarns.toLocaleString()} / student</p>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Link
                                    href="/mentor/setup"
                                    className="flex-1 sm:flex-none sm:w-auto bg-gray-900 h-[52px] flex items-center justify-center text-white font-black px-8 rounded-2xl transition-all shadow-xl active:scale-95"
                                >
                                    Edit Profile
                                </Link>
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}/coach/${mentor.id}`
                                        navigator.clipboard.writeText(url)
                                        alert('Profile link copied to clipboard!')
                                    }}
                                    className="flex-1 sm:flex-none sm:w-auto bg-blue-50 text-blue-600 border border-blue-100 h-[52px] flex items-center justify-center font-black px-8 rounded-2xl transition-all shadow-sm active:scale-95"
                                >
                                    Share
                                </button>
                            </div>
                        </>
                    ) : viewerRole === 'student' ? (
                        <>
                             <div className="w-full sm:w-auto text-center sm:text-left">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Subscription Plan</p>
                                <p className="text-xl font-black text-gray-900">Rs. {pricing.studentPays.toLocaleString()}<span className="text-sm font-medium text-gray-400">/mo</span></p>
                            </div>
                            {mentor.current_student_count >= mentor.max_students ? (
                                <button 
                                    disabled
                                    className="w-full sm:w-auto h-[52px] bg-gray-100 text-gray-400 font-black px-10 rounded-2xl cursor-not-allowed"
                                >
                                    Fully Booked
                                </button>
                            ) : (
                                <Link
                                    href={`/subscribe/${mentor.id}`}
                                    className="w-full sm:w-auto h-[52px] bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white font-black px-10 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                                >
                                    Subscribe Now
                                </Link>
                            )}
                        </>
                    ) : viewerRole === 'mentor' ? (
                        <div className="w-full flex items-center justify-center py-2">
                            <p className="text-gray-500 font-bold italic text-sm">You are viewing this as a fellow coach (View Only Mode)</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-full sm:w-auto text-center sm:text-left">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Pricing</p>
                                <p className="text-lg font-black text-gray-400 italic">Sign up to see pricing</p>
                            </div>
                            <Link
                                href="/signup"
                                className="w-full sm:w-auto h-[52px] bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white font-black px-10 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

