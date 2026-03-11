'use client'
// @ts-nocheck
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPricing } from '@/lib/pricing'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCoaches: 0,
    activeSubs: 0,
    revenue: 0
  })

  // Table & Action counts
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [pendingCoachesCount, setPendingCoachesCount] = useState(0)
  const [unreadContactsCount, setUnreadContactsCount] = useState(0)
  const [registeredCoachesCount, setRegisteredCoachesCount] = useState(0)
  const [activities, setActivities] = useState<any[]>([])

  const router = useRouter()
  const supabase: any = createClient()
  const adminEmail = 'nnpinidiya@gmail.com'

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } }: any = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    if (user.email !== adminEmail) {
      router.push('/')
      return
    }

    setAuthorized(true)
    setLoading(false)
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'admin123') { // Simple hardcoded password as requested
      setShowDashboard(true)
      loadDashboardData()
    } else {
      setError('Invalid admin password')
    }
  }

  async function loadDashboardData() {
    setLoading(true)

    // 1. Basic Stats
    const { count: studentCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student')
    const { count: mentorCount } = await supabase.from('mentors').select('*', { count: 'exact', head: true })
    const { data: activeSubs }: any = await supabase.from('subscriptions').select('amount_paid, mentor:mentor_id(exam_type)').eq('status', 'active')

    // Revenue Calculation: (AL active subs x 800) + (OL active subs x 500)
    // Note: The user prompt asked for this specific formula, regardless of amount_paid
    let platformRevenue = 0
    activeSubs?.forEach((sub: any) => {
      const type = (sub.mentor as any)?.exam_type
      if (type === 'AL') platformRevenue += 800
      else if (type === 'OL') platformRevenue += 500
    })

    setStats({
      totalStudents: studentCount || 0,
      totalCoaches: mentorCount || 0,
      activeSubs: activeSubs?.length || 0,
      revenue: platformRevenue
    })

    // 2. Action Badges
    const { count: pendingCoaches } = await supabase.from('mentors').select('*', { count: 'exact', head: true }).eq('is_verified', false)
    const { count: unreadContacts } = await supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'new')

    setPendingCoachesCount(pendingCoaches || 0)
    setUnreadContactsCount(unreadContacts || 0)
    setRegisteredCoachesCount(mentorCount || 0)

    // 3. Pending Subscriptions
    const { data: pendingSubs }: any = await supabase
      .from('subscriptions')
      .select(`
        id,
        amount_paid,
        payment_proof_url,
        created_at,
        student:student_id(full_name, email),
        mentor:mentor_id(
          exam_type,
          user_id(full_name, email)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    setSubscriptions(pendingSubs || [])

    // 4. Activity Feed (Simulated aggregation)
    // In a real app we might have an activities table, here we aggregate latest entries
    const [latestStudents, latestMentors, latestMsgs] = await Promise.all([
      supabase.from('profiles').select('full_name, created_at').eq('role', 'student').order('created_at', { ascending: false }).limit(5),
      supabase.from('mentors').select('profiles(full_name), created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('contact_messages').select('name, created_at').order('created_at', { ascending: false }).limit(5)
    ])

    const allEvents: any[] = []
    latestStudents.data?.forEach((s: any) => allEvents.push({ text: `New student signed up: ${s.full_name}`, date: s.created_at, icon: '👤' }))
    latestMentors.data?.forEach((m: any) => allEvents.push({ text: `New coach application: ${(m.profiles as any)?.full_name}`, date: m.created_at, icon: '📋' }))
    latestMsgs.data?.forEach((msg: any) => allEvents.push({ text: `New contact message from ${msg.name}`, date: msg.created_at, icon: '📧' }))

    setActivities(allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10))

    setLoading(false)
  }

  async function handleApprove(sub: any) {
    const { error }: any = await supabase.from('subscriptions')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', sub.id)

    if (!error) {
      alert('Approved!')
      loadDashboardData()
    } else {
      alert('Error: ' + error.message)
    }
  }

  async function handleReject(subscriptionId: string) {
    const { error }: any = await supabase.from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscriptionId)

    if (!error) {
      alert('Rejected')
      loadDashboardData()
    } else {
      alert('Error: ' + error.message)
    }
  }

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
            <h1 className="text-2xl font-black text-white">Admin Access</h1>
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
              Verify & Enter Dashboard
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 pb-20">
      {/* Dark Header */}
      <header className="bg-slate-950 border-b border-slate-800 pt-20 pb-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-blue-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-white">System Admin</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-500">Live Services Active</span>
            </div>
            <h1 className="text-4xl font-black text-white italic tracking-tight">🔧 ExamCoach Admin Panel</h1>
            <p className="text-slate-400 font-medium">Platform Management Dashboard • {adminEmail}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => loadDashboardData()} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-xl transition-all">🔄</button>
            <button onClick={() => setShowDashboard(false)} className="bg-red-900/20 border border-red-900/50 text-red-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-900/40 transition-all">Lock Console</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Total Students', value: stats.totalStudents, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
            { label: 'Total Coaches', value: stats.totalCoaches, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
            { label: 'Active Subscriptions', value: stats.activeSubs, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
            { label: 'Platform Revenue', value: `Rs. ${stats.revenue.toLocaleString()}`, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
          ].map((s, idx) => (
            <div key={idx} className={`bg-slate-900 ${s.border} border p-6 rounded-3xl shadow-xl italic`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Link href="/admin/coaches" className={`p-8 rounded-3xl border transition-all group ${pendingCoachesCount > 0 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">📋</span>
              {pendingCoachesCount > 0 && <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-1 rounded-full">{pendingCoachesCount} PENDING</span>}
            </div>
            <h3 className="text-xl font-black text-white group-hover:text-blue-400">Coach Applications</h3>
            <p className="text-sm text-slate-500 mt-1">{pendingCoachesCount} applications awaiting review</p>
          </Link>

          <button onClick={() => document.getElementById('pending-section')?.scrollIntoView({ behavior: 'smooth' })} className={`p-8 rounded-3xl border text-left transition-all group ${subscriptions.length > 0 ? 'bg-red-950/20 border-red-500/30' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">💳</span>
              {subscriptions.length > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full">{subscriptions.length} AWAITING</span>}
            </div>
            <h3 className="text-xl font-black text-white group-hover:text-red-400">Pending Payments</h3>
            <p className="text-sm text-slate-500 mt-1">{subscriptions.length} manually uploaded proofs</p>
          </button>

          <Link href="/admin/chats" className="bg-slate-900 border-slate-800 p-8 rounded-3xl border transition-all group hover:border-blue-500/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">🔍</span>
            </div>
            <h3 className="text-xl font-black text-white group-hover:text-blue-400">Monitor Chats</h3>
            <p className="text-sm text-slate-500 mt-1">Platform safety monitoring</p>
          </Link>

          <Link href="/admin/bank-details" className="bg-slate-900 border-slate-800 p-8 rounded-3xl border transition-all group hover:border-blue-500/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">🏦</span>
            </div>
            <h3 className="text-xl font-black text-white group-hover:text-blue-400">Payouts & Bank Info</h3>
            <p className="text-sm text-slate-500 mt-1">{registeredCoachesCount} coaches registered</p>
          </Link>

          <Link href="/admin/contacts" className="bg-slate-900 border-slate-800 p-8 rounded-3xl border transition-all group hover:border-blue-500/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">📧</span>
              {unreadContactsCount > 0 && <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded-full">{unreadContactsCount} NEW</span>}
            </div>
            <h3 className="text-xl font-black text-white group-hover:text-blue-400">Contact Messages</h3>
            <p className="text-sm text-slate-500 mt-1">{unreadContactsCount} unread message inquiries</p>
          </Link>

          <div className="bg-slate-900 border-slate-800 p-8 rounded-3xl border italic">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">📊</span>
            </div>
            <h3 className="text-xl font-black text-slate-600">Platform Stats</h3>
            <p className="text-sm text-slate-500 mt-1">Detailed analytics incoming...</p>
          </div>
        </div>

        {/* Pending Subscriptions Section */}
        <section id="pending-section" className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-white">💳 Pending Approvals</h2>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{subscriptions.length} Items</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-900 border-b border-slate-800 italic text-[10px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-6 py-4">Student Info</th>
                  <th className="px-6 py-4">Coaching Tier</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Submitted</th>
                  <th className="px-6 py-4">Proof</th>
                  <th className="px-6 py-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{sub.student?.full_name}</div>
                      <div className="text-[10px] text-slate-500">{sub.student?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-300">{sub.mentor?.user_id?.full_name}</div>
                      <div className={`text-[10px] inline-block px-1.5 py-0.5 rounded mt-1 font-black ${sub.mentor?.exam_type === 'AL' ? 'bg-purple-900 text-purple-300' : 'bg-orange-900 text-orange-300'}`}>
                        {sub.mentor?.exam_type} COACHING
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-blue-400">Rs. {sub.amount_paid?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{new Date(sub.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <a href={sub.payment_proof_url} target="_blank" className="text-xs font-black text-blue-500 hover:underline">VIEW DOC ↗</a>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleApprove(sub)} className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-all animate-pulse">✅</button>
                        <button onClick={() => handleReject(sub.id)} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all">❌</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic">No payments awaiting verification at this time.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Activity Feed */}
        <section className="bg-slate-950 border border-slate-800 rounded-3xl p-8 italic">
          <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Recent Activity Log
          </h2>
          <div className="space-y-6">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-4 pb-6 border-b border-slate-900 last:border-0 last:pb-0">
                <span className="text-2xl mt-1">{a.icon}</span>
                <div>
                  <p className="text-sm font-bold text-slate-200">{a.text}</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-black uppercase tracking-widest">{new Date(a.date).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
