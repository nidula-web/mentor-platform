"use client"
// @ts-nocheck

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function MentorPendingPage() {
    const [mentor, setMentor] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase: any = createClient()

    async function checkStatus() {
        setLoading(true)
        const { data: { user } }: any = await supabase.auth.getUser()
        if (!user) {
            router.replace("/login")
            return
        }

        const { data: mentorData }: any = await supabase
            .from("mentors")
            .select("*")
            .eq("user_id", user.id)
            .single()

        if (!mentorData) {
            router.replace("/mentor/setup")
            return
        }

        if (mentorData.is_verified) {
            router.replace("/mentor/dashboard")
            return
        }

        setMentor(mentorData)
        setLoading(false)
    }

    useEffect(() => {
        checkStatus()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin text-4xl">🌀</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="max-w-2xl mx-auto px-6">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 text-center">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">⏳</div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Application Submitted!</h1>
                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                        Thank you for applying to become an ExamCoach. Our team will review your details and result sheet within 24-48 hours.
                    </p>
                    
                    <div className="bg-blue-50 rounded-2xl p-6 mb-8 text-left border border-blue-100">
                        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <span>📋</span> Application Details
                        </h3>
                        <div className="space-y-2 text-sm text-blue-800">
                            <p><strong>Stream:</strong> {mentor.al_stream || mentor.exam_type}</p>
                            <p><strong>University:</strong> {mentor.university}</p>
                            <p><strong>Degree:</strong> {mentor.degree_program}</p>
                            <p><strong>Subjects:</strong> {mentor.subjects?.join(", ")}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button 
                            onClick={checkStatus}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                        >
                            Check Status
                        </button>
                        <p className="text-sm text-gray-400">
                            Questions? <Link href="/contact" className="text-blue-600 font-bold hover:underline">Contact Support</Link>
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500 italic">
                        "You cannot accept students until your profile is verified."
                    </p>
                </div>
            </div>
        </div>
    )
}

