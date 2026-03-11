'use client'
// @ts-nocheck

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ChatMessage = {
    id: string
    subscription_id: string
    sender_id: string
    sender_name?: string
    content: string
    message_type: 'text' | 'image' | 'voice'
    created_at: string
}

type ChatSubscription = {
    id: string
    student_id: string
    student_name: string
    mentor_id: string
    coach_name: string
    status: string
    last_message?: string
    last_message_time?: string
    message_count: number
    is_flagged: boolean
    flag_reason?: string
}

const FLAG_KEYWORDS = ['whatsapp', 'telegram', 'viber', 'call me', 'contact me', 'phone', 'pay direct', 'bank account', '07', '+94']
const PHONE_REGEX = /(?:\+94|0)7[0-9]{8}/g
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

export default function AdminChatsPage() {
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const [showDashboard, setShowDashboard] = useState(false)
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    
    const [subscriptions, setSubscriptions] = useState<ChatSubscription[]>([])
    const [selectedChat, setSelectedChat] = useState<string | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [messagesLoading, setMessagesLoading] = useState(false)

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
        if (password === 'admin123') {
            setShowDashboard(true)
            loadChats()
        } else {
            setError('Invalid admin password')
        }
    }

    async function loadChats() {
        setLoading(true)
        const { data: subs, error: subsError } = await supabase
            .from('subscriptions')
            .select(`
                id,
                student_id,
                mentor_id,
                status,
                student:student_id(full_name),
                mentor:mentor_id(
                    user_id(full_name)
                )
            `)
            .eq('status', 'active')

        if (subsError) {
            console.error(subsError)
            setLoading(false)
            return
        }

        const chatData: ChatSubscription[] = await Promise.all(subs.map(async (sub: any) => {
            const { data: msgs, count } = await supabase
                .from('messages')
                .select('content, created_at', { count: 'exact' })
                .eq('subscription_id', sub.id)
                .order('created_at', { ascending: false })

            const lastMsg = msgs && msgs.length > 0 ? msgs[0] : null
            
            // Check for flags in ALL messages of this sub (simple version: just check last 20)
            const { data: recentMsgs }: any = await supabase
                .from('messages')
                .select('content')
                .eq('subscription_id', sub.id)
                .limit(20)
            
            let isFlagged = false
            let flagReason = ''

            recentMsgs?.forEach((m: { content: string | null }) => {
                const content = (m.content || '').toLowerCase()
                if (PHONE_REGEX.test(content)) { isFlagged = true; flagReason = 'Phone Number Detected' }
                if (EMAIL_REGEX.test(content)) { isFlagged = true; flagReason = 'Email Detected' }
                FLAG_KEYWORDS.forEach(kw => {
                    if (content.includes(kw)) { isFlagged = true; flagReason = `Keyword: ${kw}` }
                })
            })

            return {
                id: sub.id,
                student_id: sub.student_id,
                student_name: sub.student?.full_name || 'Unknown Student',
                mentor_id: sub.mentor_id,
                coach_name: sub.mentor?.user_id?.full_name || 'Unknown Coach',
                status: sub.status,
                last_message: lastMsg?.content || 'No messages',
                last_message_time: lastMsg?.created_at,
                message_count: count || 0,
                is_flagged: isFlagged,
                flag_reason: flagReason
            }
        }))

        // Sort: Flagged first, then newest message
        setSubscriptions(chatData.sort((a, b) => {
            if (a.is_flagged && !b.is_flagged) return -1
            if (!a.is_flagged && b.is_flagged) return 1
            return new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()
        }))
        setLoading(false)
    }

    async function loadMessages(subId: string) {
        setMessagesLoading(true)
        setSelectedChat(subId)
        
        const { data: msgs, error } = await supabase
            .from('messages')
            .select(`
                id,
                subscription_id,
                sender_id,
                content,
                message_type,
                created_at
            `)
            .eq('subscription_id', subId)
            .order('created_at', { ascending: true })

        if (msgs) {
            // Fetch sender names
            const senderIds = [...new Set(msgs.map((m: any) => m.sender_id))]
            const { data: profiles }: any = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', senderIds)
            
            const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]))
            
            setMessages(msgs.map((m: any) => ({
                ...m,
                sender_name: profileMap.get(m.sender_id) || 'Unknown'
            })))
        }
        setMessagesLoading(false)
    }

    const filteredChats = useMemo(() => {
        return subscriptions.filter(s => 
            s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.coach_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [subscriptions, searchQuery])

    const isSuspicious = (text: string) => {
        const content = text.toLowerCase()
        if (PHONE_REGEX.test(content)) return true
        if (EMAIL_REGEX.test(content)) return true
        return FLAG_KEYWORDS.some(kw => content.includes(kw))
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
                        <h1 className="text-2xl font-black text-white">Chat Monitor Access</h1>
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
                            Enter Monitor
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col">
            {/* Admin Header */}
            <header className="bg-slate-950 border-b border-slate-800 fixed top-0 left-0 right-0 z-50 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="text-slate-500 hover:text-white transition-all">← Back</Link>
                        <h1 className="text-xl font-black text-white">🔍 Chat Safety Monitor</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                            <input 
                                type="text"
                                placeholder="Search by student or coach..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none w-64"
                            />
                        </div>
                        <button onClick={loadChats} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition-all">🔄</button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full flex mt-20 p-6 gap-6 h-[calc(100vh-80px)] overflow-hidden">
                {/* Chat List Sidebar */}
                <div className="w-1/3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Active Conversations ({filteredChats.length})</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredChats.map(chat => (
                            <button 
                                key={chat.id}
                                onClick={() => loadMessages(chat.id)}
                                className={`w-full text-left p-4 border-b border-slate-900 hover:bg-slate-900 transition-all group ${selectedChat === chat.id ? 'bg-slate-900 border-l-4 border-l-blue-500' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-bold text-white group-hover:text-blue-400 transition-all">{chat.student_name}</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">
                                        {chat.last_message_time ? new Date(chat.last_message_time).toLocaleDateString() : ''}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 mb-2 italic">Coach: {chat.coach_name}</div>
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-slate-500 truncate pr-4 max-w-[180px]">
                                        {chat.last_message}
                                    </div>
                                    <div className="flex gap-2">
                                        {chat.is_flagged && <span title={chat.flag_reason} className="text-lg">🚩</span>}
                                        <span className="bg-slate-800 text-[10px] px-2 py-0.5 rounded text-slate-400">{chat.message_count} msg</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                        {filteredChats.length === 0 && (
                            <div className="p-10 text-center text-slate-600 italic">No chats found.</div>
                        )}
                    </div>
                </div>

                {/* Chat Details Panel */}
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
                    {!selectedChat ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                            <span className="text-6xl mb-4 opacity-20">💬</span>
                            <p className="font-bold italic">Select a conversation to start monitoring</p>
                            <p className="text-xs mt-2">Suspicious messages will be highlighted in red</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                                <div>
                                    <h3 className="font-black text-white">Monitoring: {subscriptions.find(s => s.id === selectedChat)?.student_name}</h3>
                                    <p className="text-xs text-slate-500">Coached by {subscriptions.find(s => s.id === selectedChat)?.coach_name}</p>
                                </div>
                                <div className="text-right">
                                    <span className="bg-green-900/20 text-green-400 text-[10px] px-2 py-1 rounded font-black uppercase tracking-widest border border-green-900/50">Live Sync</span>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950">
                                {messagesLoading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="animate-spin">🌀</div>
                                    </div>
                                ) : (
                                    messages.map((msg, i) => {
                                        const suspicious = msg.message_type === 'text' && isSuspicious(msg.content)
                                        return (
                                            <div key={msg.id} className="flex flex-col gap-1 max-w-[80%]">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{msg.sender_name}</span>
                                                    <span className="text-[9px] text-slate-600 font-bold">{new Date(msg.created_at).toLocaleString()}</span>
                                                </div>
                                                <div className={`p-4 rounded-2xl border transition-all ${
                                                    suspicious 
                                                        ? 'bg-red-950/30 border-red-500/50 text-red-100 shadow-lg shadow-red-950/50' 
                                                        : 'bg-slate-900 border-slate-800'
                                                }`}>
                                                    {msg.message_type === 'text' && (
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                    )}
                                                    {msg.message_type === 'image' && (
                                                        <div className="space-y-2">
                                                            <a href={msg.content} target="_blank" rel="noreferrer">
                                                                <img 
                                                                    src={msg.content} 
                                                                    alt="Chat asset" 
                                                                    className="rounded-lg max-h-64 hover:opacity-90 transition-all cursor-zoom-in"
                                                                />
                                                            </a>
                                                            <p className="text-[10px] text-slate-500 text-center">Click to view full size</p>
                                                        </div>
                                                    )}
                                                    {msg.message_type === 'voice' && (
                                                        <div className="pt-2">
                                                            <audio controls className="h-8 w-full">
                                                                <source src={msg.content} type="audio/mpeg" />
                                                                Your browser does not support the audio element.
                                                            </audio>
                                                        </div>
                                                    )}
                                                    {suspicious && (
                                                        <div className="mt-3 pt-3 border-t border-red-500/20 flex items-center gap-2">
                                                            <span className="text-xs">🚩</span>
                                                            <span className="text-[10px] font-black uppercase tracking-tight text-red-400">Potential Off-Platform Contact Detected</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                                <div className="h-4"></div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}

