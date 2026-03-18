'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminCoachesPage() {
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const [pendingCoaches, setPendingCoaches] = useState<any[]>([])
    const router = useRouter()
    const supabase: any = createClient()
    const adminEmail = 'nnpinidiya@gmail.com'

    useEffect(() => {
        checkAuth()
    }, [])

    async function checkAuth() {
        const { data: { user } }: any = await supabase.auth.getUser()
        if (!user || user.email !== adminEmail) {
            router.push('/')
            return
        }
        setAuthorized(true)
        loadPendingCoaches()
    }

    async function loadPendingCoaches() {
        setLoading(true)
        const { data, error } = await supabase
            .from('mentors')
            .select(`
                *,
                profile:user_id(full_name, email, profile_picture)
            `)
            .eq('is_verified', false)
            .order('created_at', { ascending: false })

        if (error) console.error('Error loading coaches:', error)
        else setPendingCoaches(data || [])
        setLoading(false)
    }

    async function handleApprove(mentorId) {
        console.log('Approving mentor:', mentorId)

        const { data, error } = await (supabase as any)
            .from('mentors')
            .update({ is_verified: true })
            .eq('id', mentorId)
            .select()

        console.log('Update result:', data)
        console.log('Update error:', error)

        if (error) {
            alert('Error approving: ' + error.message)
            return
        }

        // Verify it actually updated
        const { data: check } = await (supabase as any)
            .from('mentors')
            .select('is_verified')
            .eq('id', mentorId)
            .single()

        console.log('Verification check:', check)

        if (check && check.is_verified === true) {
            setPendingCoaches(prev => prev.filter(c => c.id !== mentorId))
            alert('✅ Coach Approved Successfully!')
        } else {
            alert('⚠️ Something went wrong. Please try again.')
        }
    }

    async function handleReject(mentorId: string, userId: string) {
        if (!confirm('Are you sure you want to reject and DELETE this application?')) return

        // Send notification before deletion (if profile exists)
        await supabase.from('notifications').insert({
            user_id: userId,
            title: "Application Status",
            message: "Your application was not approved. Contact us for details.",
            type: "warning",
            link: "/contact"
        })

        const { error }: any = await supabase
            .from('mentors')
            .delete()
            .eq('id', mentorId)

        if (error) {
            alert('Error rejecting coach: ' + error.message)
            return
        }

        // Remove from list immediately
        setPendingCoaches(prev => prev.filter(c => c.id !== mentorId))
        alert('❌ Coach Rejected')
    }

    if (!authorized && !loading) return null

    return (
        <div className="min-h-screen bg-gray-50 pt-20 pb-12">
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/admin" className="text-blue-600 text-sm font-bold hover:underline">← Back to Dashboard</Link>
                        <h1 className="text-3xl font-bold text-gray-900 mt-2">
                            Coach Applications ({pendingCoaches.length})
                        </h1>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin text-4xl mb-4">🌀</div>
                        <p className="text-gray-500">Loading applications...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {pendingCoaches.map((coach) => (
                            <div key={coach.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
                                <div className="p-8">
                                    <div className="grid lg:grid-cols-3 gap-8">
                                        {/* Basic Info */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-full bg-blue-100 overflow-hidden">
                                                    {coach.profile?.profile_picture ? (
                                                        <img src={coach.profile.profile_picture} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="flex items-center justify-center h-full text-2xl">👤</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-xl text-gray-900">{coach.profile?.full_name}</h3>
                                                    <p className="text-sm text-gray-500">{coach.profile?.email}</p>
                                                    <p className="text-xs font-medium text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded-full mt-1">
                                                        {coach.al_stream || coach.exam_type}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm italic">
                                                <p><strong>Uni:</strong> {coach.university}</p>
                                                <p><strong>Degree:</strong> {coach.degree_program}</p>
                                                <p><strong>Z-Score:</strong> {coach.z_score}</p>
                                                <p><strong>A/L Year:</strong> {coach.exam_year}</p>
                                                <p><strong>Index:</strong> {coach.index_number}</p>
                                            </div>
                                        </div>

                                        {/* Subjects & Bio */}
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Subjects & Grades</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {coach.subjects?.map((s: string) => (
                                                        <span key={s} className="bg-white border px-2 py-1 rounded text-xs font-bold text-gray-700">
                                                            {s}: {coach.results[s] || 'A'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Bio</h4>
                                                <p className="text-sm text-gray-600 line-clamp-4">{coach.bio}</p>
                                            </div>
                                        </div>

                                        {/* Result Sheet & Actions */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Verification Proof</h4>
                                            {coach.results?.result_sheet_url ? (
                                                <a 
                                                    href={coach.results.result_sheet_url} 
                                                    target="_blank"
                                                    className="block border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-blue-400 transition-colors group"
                                                >
                                                    <div className="text-center">
                                                        <span className="text-3xl grayscale group-hover:grayscale-0">📄</span>
                                                        <p className="text-xs font-bold text-blue-600 mt-2">View Full Result Sheet</p>
                                                    </div>
                                                </a>
                                            ) : (
                                                <p className="text-xs text-red-500 font-bold">No result sheet uploaded!</p>
                                            )}

                                            <div className="flex gap-3 mt-auto pt-4">
                                                <button
                                                    onClick={() => handleApprove(coach.id)}
                                                    className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-green-700 shadow-lg shadow-green-600/20"
                                                >
                                                    ✅ Approve
                                                </button>
                                                <button
                                                    onClick={() => handleReject(coach.id, coach.user_id)}
                                                    className="flex-1 bg-white border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold hover:bg-red-50"
                                                >
                                                    ❌ Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {pendingCoaches.length === 0 && (
                            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
                                <span className="text-4xl mb-4 block">🎉</span>
                                <h3 className="text-xl font-bold text-gray-900">No pending applications 🎉</h3>
                                <p className="text-gray-500">All set! No coaches are waiting for verification.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

