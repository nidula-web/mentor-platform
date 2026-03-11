'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPricing } from '@/lib/pricing'

export default function AdminBankDetailsPage() {
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const [coaches, setCoaches] = useState<any[]>([])
    const [bankDetails, setBankDetails] = useState<any[]>([])
    const [filter, setFilter] = useState('All')
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
        loadCoachData()
    }

    async function loadCoachData() {
        setLoading(true)
        try {
            // Get all verified mentors
            const { data: mentors, error: mentorError } = await supabase
                .from('mentors')
                .select('*')
                .eq('is_verified', true)

            if (mentorError) throw mentorError

            if (!mentors || mentors.length === 0) {
                setCoaches([])
                setLoading(false)
                return
            }

            // Get profiles for mentors
            const userIds = mentors.map((m: any) => m.user_id)
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone')
                .in('id', userIds)

            if (profileError) throw profileError

            // Get bank details
            const { data: bankDetails, error: bankError } = await supabase
                .from('coach_bank_details')
                .select('*')

            if (bankError) throw bankError

            const profileMap = new Map(profiles.map((p: any) => [p.id, p]))
            const bankMap = new Map(bankDetails.map((b: any) => [b.mentor_id, b]))

            const merged = mentors.map((m: any) => {
                const profile = profileMap.get(m.user_id)
                const bank = bankMap.get(m.id)
                const pricing = getPricing(m.exam_type)
                const monthlyEarning = (m.current_student_count || 0) * pricing.coachEarns

                return {
                    ...m,
                    profile,
                    bank,
                    monthlyEarning,
                    hasBank: !!bank
                }
            })

            setCoaches(merged)
        } catch (err) {
            console.error('Error loading coach data:', err)
            alert('Failed to load coach data')
        }
        setLoading(false)
    }

    const filteredCoaches = coaches.filter(c => {
        if (filter === 'With Bank') return c.hasBank
        if (filter === 'Without Bank') return !c.hasBank
        return true
    })

    const stats = {
        withBank: coaches.filter(c => c.hasBank).length,
        withoutBank: coaches.filter(c => !c.hasBank).length,
        totalPayout: coaches.reduce((sum, c) => sum + c.monthlyEarning, 0)
    }

    function copyPayoutsToClipboard() {
        const withBank = coaches.filter(c => c.hasBank && c.monthlyEarning > 0)
        if (withBank.length === 0) {
            alert('No payouts to export')
            return
        }

        const text = withBank.map(c => {
            const bankName = c.bank.bank_name === 'Other' ? c.bank.other_bank_name : c.bank.bank_name
            return `${c.profile?.full_name} | ${bankName} | ${c.bank.account_number} | Rs. ${c.monthlyEarning.toLocaleString()}`
        }).join('\n')

        navigator.clipboard.writeText(text)
        alert('Payout data copied to clipboard!')
    }

    if (!authorized && !loading) return null

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <Link href="/admin" className="text-blue-400 text-sm font-bold hover:underline">← Back to Dashboard</Link>
                        <h1 className="text-3xl font-black text-white mt-2">Coach Bank Details & Payouts</h1>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={copyPayoutsToClipboard}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
                        >
                            📋 Copy Payout List
                        </button>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800 italic">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">With Bank Details</p>
                        <p className="text-3xl font-black text-green-400">{stats.withBank}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800 italic">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Missing Bank Details</p>
                        <p className="text-3xl font-black text-red-400">{stats.withoutBank}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800 italic">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Total Payouts</p>
                        <p className="text-3xl font-black text-blue-400">Rs. {stats.totalPayout.toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                        <div className="flex gap-2">
                            {['All', 'With Bank', 'Without Bank'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                        filter === f ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-white border border-slate-700 shadow-sm'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Showing {filteredCoaches.length} Coaches</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900 border-b border-slate-800 italic text-[10px] uppercase tracking-widest text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Coach</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Exam / Students</th>
                                    <th className="px-6 py-4 text-blue-400">Earnings</th>
                                    <th className="px-6 py-4">Bank Details</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredCoaches.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-900/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white">{c.profile?.full_name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{c.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-slate-400">{c.profile?.email}</div>
                                            <div className="text-xs text-slate-400">{c.profile?.phone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${c.exam_type === 'AL' ? 'bg-purple-900 text-purple-300' : 'bg-orange-900 text-orange-300'}`}>
                                                    {c.exam_type}
                                                </span>
                                                <span className="text-sm font-medium text-slate-300">{c.current_student_count || 0} students</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-black text-blue-400">Rs. {c.monthlyEarning.toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.hasBank ? (
                                                <div className="text-xs space-y-0.5">
                                                    <p className="font-bold text-white">{c.bank.bank_name === 'Other' ? c.bank.other_bank_name : c.bank.bank_name}</p>
                                                    <p className="text-slate-500">{c.bank.branch_name}</p>
                                                    <p className="font-mono bg-slate-900 border border-slate-700 px-1 inline-block rounded text-slate-300">{c.bank.account_number}</p>
                                                    <p className="italic text-slate-500">{c.bank.account_holder_name}</p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">Not provided</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.hasBank ? (
                                                <span className="text-[10px] font-black uppercase text-green-400 bg-green-400/10 px-2 py-1 rounded border border-green-400/20">
                                                    Bank Added ✅
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20">
                                                    No Bank Details ❌
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredCoaches.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic">No coaches found in this category.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

