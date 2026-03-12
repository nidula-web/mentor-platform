"use client"
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminContactsPage() {
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const [messages, setMessages] = useState<any[]>([])
    const [filter, setFilter] = useState('All')
    const [expandedId, setExpandedId] = useState<string | null>(null)
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
        loadMessages()
    }

    async function loadMessages() {
        setLoading(true)
        let query = supabase
            .from('contact_messages')
            .select('*')
            .order('created_at', { ascending: false })

        if (filter !== 'All') {
            query = query.eq('status', filter.toLowerCase())
        }

        const { data, error } = await query
        if (error) console.error('Error loading messages:', error)
        else setMessages(data || [])
        setLoading(false)
    }

    useEffect(() => {
        if (authorized) loadMessages()
    }, [filter, authorized])

    async function updateStatus(id: string, newStatus: string) {
        const { error }: any = await supabase.from('contact_messages')
            .update({ status: newStatus })
            .eq('id', id)

        if (error) alert('Error updating status: ' + error.message)
        else loadMessages()
    }

    if (!authorized && !loading) return null

    return (
        <div className="min-h-screen bg-gray-50 pt-20 pb-12">
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/admin" className="text-blue-600 text-sm font-bold hover:underline">← Back to Dashboard</Link>
                        <h1 className="text-3xl font-bold text-gray-900 mt-2">Contact Messages</h1>
                    </div>
                    
                    <div className="flex flex-wrap bg-white rounded-xl shadow-sm border border-gray-100 p-1 gap-1">
                        {['All', 'New', 'Read', 'Resolved'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                                    filter === f ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin text-4xl mb-4">🌀</div>
                        <p className="text-gray-500">Loading messages...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100 italic text-xs uppercase tracking-wider text-gray-500">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Subject</th>
                                    <th className="px-6 py-4">Message Preview</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {messages.map((msg) => (
                                    <>
                                        <tr 
                                            key={msg.id} 
                                            onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                                            className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                                        >
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(msg.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{msg.name}</div>
                                                <div className="text-xs text-gray-500">{msg.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                                                    {msg.subject}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                                {msg.message}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border-2 ${
                                                    msg.status === 'resolved' ? 'border-green-200 text-green-700 bg-green-50' :
                                                    msg.status === 'read' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                                                    'border-red-200 text-red-700 bg-red-50'
                                                }`}>
                                                    {msg.status || 'new'}
                                                </span>
                                            </td>
                                        </tr>
                                        {expandedId === msg.id && (
                                            <tr className="bg-blue-50/50">
                                                <td colSpan={5} className="px-6 py-8">
                                                    <div className="max-w-3xl">
                                                        <h4 className="font-bold text-gray-900 mb-2">Full Message</h4>
                                                        <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">{msg.message}</p>
                                                        {msg.phone && <p className="text-sm text-gray-500 mb-6">📱 Phone: {msg.phone}</p>}
                                                        <div className="flex gap-4">
                                                            {msg.status !== 'read' && msg.status !== 'resolved' && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); updateStatus(msg.id, 'read'); }}
                                                                    className="bg-white border-2 border-blue-600 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-50"
                                                                >
                                                                    Mark as Read
                                                                </button>
                                                            )}
                                                            {msg.status !== 'resolved' && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); updateStatus(msg.id, 'resolved'); }}
                                                                    className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 shadow-lg shadow-green-600/20"
                                                                >
                                                                    Mark as Resolved
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                                {messages.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-gray-500">No messages found in this category.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

