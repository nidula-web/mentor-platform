'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminAffiliatesPage() {
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const [showDashboard, setShowDashboard] = useState(false)
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    
    const [affiliates, setAffiliates] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')

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
        setLoading(false)
    }

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (password === 'Nuwanakaadmin444#') {
            setShowDashboard(true)
            loadAffiliates()
        } else {
            setError('Invalid admin password')
        }
    }

    async function loadAffiliates() {
        setLoading(true)
        
        const { data: affs, error: affsError } = await supabase
            .from('affiliates')
            .select(`
                id,
                referral_code,
                bank_name,
                branch_name,
                account_number,
                account_name,
                total_earned,
                created_at,
                profile:id(full_name, email, phone)
            `)
            .order('total_earned', { ascending: false })

        if (affsError) {
            console.error(affsError)
            setLoading(false)
            return
        }

        // Fetch referral counts for each
        const affiliateData = await Promise.all(affs.map(async (aff: any) => {
            const { count } = await supabase
                .from('referrals')
                .select('*', { count: 'exact', head: true })
                .eq('affiliate_id', aff.id)
            
            return {
                ...aff,
                referral_count: count || 0
            }
        }))

        setAffiliates(affiliateData)
        setLoading(false)
    }

    const filteredAffiliates = affiliates.filter(a => 
        a.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.referral_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.account_number?.includes(searchQuery)
    )

    if (loading && !showDashboard) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="animate-spin text-4xl">🌀</div>
            </div>
        )
    }

    if (!authorized) return null

    if (!showDashboard) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
                    <div className="text-center mb-8">
                        <span className="text-4xl mb-4 block">🔐</span>
                        <h1 className="text-2xl font-black text-white">Affiliates Dashboard</h1>
                        <p className="text-slate-400 text-sm mt-1">Please enter the security passkey</p>
                    </div>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter passkey..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            autoFocus
                        />
                        {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}
                        <button 
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                        >
                            Enter Dashboard
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col pb-20">
            {/* Admin Header */}
            <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50 px-6 py-4">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="text-slate-500 hover:text-white transition-all text-sm font-bold">← Back to Admin</Link>
                        <h1 className="text-2xl font-black text-white italic tracking-tight">🤝 Affiliate Partners ({affiliates.length})</h1>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                            <input 
                                type="text"
                                placeholder="Search affiliates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <button onClick={loadAffiliates} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition-all">🔄</button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
                
                <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 border-b border-slate-800 italic text-[10px] uppercase tracking-widest text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Partner Info</th>
                                <th className="px-6 py-4">Referral Code</th>
                                <th className="px-6 py-4">Total Earned</th>
                                <th className="px-6 py-4">Referrals</th>
                                <th className="px-6 py-4">Bank Details (For Payouts)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredAffiliates.map(aff => (
                                <tr key={aff.id} className="hover:bg-slate-900/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-white mb-1">{aff.profile?.full_name}</div>
                                        <div className="text-[10px] text-slate-500">{aff.profile?.email}</div>
                                        <div className="text-[10px] text-slate-500">{aff.profile?.phone}</div>
                                        <div className="text-[10px] text-slate-600 mt-1">Joined: {new Date(aff.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs font-bold bg-slate-800 text-blue-400 px-2 py-1 rounded">
                                            {aff.referral_code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-black text-green-400 text-lg">Rs. {aff.total_earned.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-blue-900/30 text-blue-400 font-black px-3 py-1 rounded-full text-xs">
                                            {aff.referral_count} Joined
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {aff.account_number ? (
                                            <div className="text-xs space-y-1">
                                                <div className="font-bold text-slate-300">{aff.bank_name} - {aff.branch_name}</div>
                                                <div className="font-mono text-yellow-500">{aff.account_number}</div>
                                                <div className="text-slate-400">{aff.account_name}</div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-600 italic">No bank details added</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredAffiliates.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No partners found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </main>
        </div>
    )
}
