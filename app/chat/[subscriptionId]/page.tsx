'use client'
// @ts-nocheck
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function ChatPage() {
    const params = useParams()
    const router = useRouter()
    const subscriptionId = params.subscriptionId
    const supabase = createClient()

    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [otherUserName, setOtherUserName] = useState('Loading...')
    const [otherUserProfilePic, setOtherUserProfilePic] = useState<string | null>(null)
    const [isOnline, setIsOnline] = useState(false)
    const [lastSeen, setLastSeen] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [isRecording, setIsRecording] = useState(false)
    const [blocked, setBlocked] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])

    const blockedPatterns = [
        /07\d{8}/,
        /\+94\d{9}/,
        /\d{10,}/,
        /[\w.-]+@[\w.-]+\.\w+/,
        /whatsapp/i,
        /telegram/i,
        /viber/i,
        /call me/i,
        /contact me/i,
        /phone/i,
    ]

    useEffect(() => {
        loadChat()
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    function isBlockedContent(text: string) {
        for (const pattern of blockedPatterns) {
            if (pattern.test(text)) {
                return true
            }
        }
        return false
    }

    function formatRelativeTime(dateString: string) {
        if (!dateString) return ''
        const date = new Date(dateString)
        const now = new Date()
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (diffInSeconds < 60) return 'Just now'
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
        
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
        
        return date.toLocaleDateString()
    }

    async function loadChat() {
        try {
            console.log('Loading chat for sub:', subscriptionId)
            const { data } = await supabase.auth.getUser()
            const user = data?.user
            if (!user) {
                console.log('No user found, redirecting to login')
                router.push('/login')
                return
            }
            setCurrentUserId(user.id)
            console.log('Current user:', user.id)

            const { data: sub } = await supabase
                .from('subscriptions')
                .select('student_id, mentor_id')
                .eq('id', subscriptionId)
                .single()

            console.log('Subscription data:', sub)

            if (sub) {
                const isStudent = sub.student_id === user.id
                let otherUserId = isStudent ? null : sub.student_id

                if (isStudent) {
                    const { data: mentor } = await supabase
                        .from('mentors')
                        .select('user_id')
                        .eq('id', sub.mentor_id)
                        .single()
                    console.log('Mentor for student:', mentor)
                    if (mentor) otherUserId = mentor.user_id
                }

                console.log('Identified otherUserId:', otherUserId)

                if (otherUserId) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, profile_picture, is_online, last_seen')
                        .eq('id', otherUserId)
                        .single()

                    console.log('Other user profile:', profile)

                    if (profile) {
                        setOtherUserName(profile.full_name)
                        setOtherUserProfilePic(profile.profile_picture)
                        setIsOnline(profile.is_online)
                        setLastSeen(profile.last_seen)
                    }
                }
            }

            const { data: msgs } = await supabase
                .from('messages')
                .select('*')
                .eq('subscription_id', subscriptionId)
                .order('created_at', { ascending: true })
            
            console.log('Messages loaded:', msgs?.length || 0)

            if (msgs) setMessages(msgs)

            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('subscription_id', subscriptionId)
                .neq('sender_id', user.id)

            const channel = supabase
                .channel('chat-' + subscriptionId)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: 'subscription_id=eq.' + subscriptionId
                    },
                    (payload: any) => {
                        setMessages(prev => [...prev, payload.new])
                    }
                )
                .subscribe()

            setLoading(false)
        } catch (err) {
            console.error('Error loading chat:', err)
            setLoading(false)
        }
    }

    async function sendMessage() {
        if (!newMessage.trim() || !currentUserId) return

        if (isBlockedContent(newMessage)) {
            setBlocked(true)
            setTimeout(() => setBlocked(false), 3000)
            return
        }

        await supabase.from('messages').insert({
            subscription_id: subscriptionId,
            sender_id: currentUserId,
            content: newMessage.trim(),
            message_type: 'text',
            is_read: false
        })

        setNewMessage('')
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file || !currentUserId) return

        const fileName = currentUserId + '-' + Date.now() + '-' + file.name

        const { error } = await supabase.storage
            .from('chat-images')
            .upload(fileName, file)

        if (error) {
            alert('Failed to upload image')
            return
        }

        const { data: urlData } = supabase.storage
            .from('chat-images')
            .getPublicUrl(fileName)

        await supabase.from('messages').insert({
            subscription_id: subscriptionId,
            sender_id: currentUserId,
            image_url: urlData.publicUrl,
            message_type: 'image',
            is_read: false
        })

        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                audioChunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                stream.getTracks().forEach(track => track.stop())

                const fileName = currentUserId + '-' + Date.now() + '.webm'
                const { error } = await supabase.storage
                    .from('voice-messages')
                    .upload(fileName, audioBlob)

                if (error) {
                    alert('Failed to upload voice message')
                    return
                }

                const { data: urlData } = supabase.storage
                    .from('voice-messages')
                    .getPublicUrl(fileName)

                await supabase.from('messages').insert({
                    subscription_id: subscriptionId,
                    sender_id: currentUserId,
                    voice_url: urlData.publicUrl,
                    message_type: 'voice',
                    is_read: false
                })
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (err) {
            alert('Could not access microphone')
        }
    }

    function stopRecording() {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    function formatTime(dateString: string) {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p className="text-xl">Loading chat...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm z-10">
                <button 
                    onClick={() => router.back()} 
                    className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-all active:scale-90"
                >
                    <span className="text-xl">←</span>
                </button>
                
                <div className="relative">
                    {otherUserProfilePic ? (
                        <img 
                            src={otherUserProfilePic} 
                            alt={otherUserName} 
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm" 
                        />
                    ) : (
                        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm ring-2 ring-white">
                            {otherUserName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h1 className="font-bold text-slate-900 text-base sm:text-lg truncate leading-none mb-1">
                        {otherUserName}
                    </h1>
                    <div className="flex items-center gap-1.5">
                        {isOnline ? (
                            <span className="text-[11px] font-bold text-green-600 uppercase tracking-widest flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                Online
                            </span>
                        ) : (
                            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                                {lastSeen ? `Last seen ${formatRelativeTime(lastSeen)}` : 'Offline'}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex gap-1">
                    <button className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition-all opacity-50 cursor-not-allowed">
                        📞
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition-all opacity-50 cursor-not-allowed">
                        📹
                    </button>
                </div>
            </div>

            {blocked && (
                <div className="bg-amber-50 border-b border-amber-100 text-amber-800 p-3 text-center text-[11px] font-medium flex items-center justify-center gap-2">
                    <span>🔒 Personal contact details are protected for your security.</span>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10">
                        <p className="text-4xl mb-2">👋</p>
                        <p>Say hello to your Exam Coach!</p>
                    </div>
                )}

                {messages.map((msg: any) => {
                    const isMe = msg.sender_id === currentUserId
                    return (
                        <div key={msg.id} className={'flex ' + (isMe ? 'justify-end' : 'justify-start')}>
                            <div className={'max-w-[75%] rounded-2xl p-3 ' + (isMe ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm shadow')}>
                                {msg.message_type === 'text' && msg.content && (
                                    <p className="break-words">{msg.content}</p>
                                )}

                                {msg.message_type === 'image' && msg.image_url && (
                                    <img src={msg.image_url} alt="Shared" className="rounded-lg max-w-full max-h-60 cursor-pointer" onClick={() => window.open(msg.image_url, '_blank')} />
                                )}

                                {msg.message_type === 'voice' && msg.voice_url && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🎤</span>
                                        <audio controls className="max-w-[200px] h-8">
                                            <source src={msg.voice_url} type="audio/webm" />
                                        </audio>
                                    </div>
                                )}

                                <div className={'flex items-center justify-end gap-1 mt-1 text-xs ' + (isMe ? 'text-blue-100' : 'text-gray-400')}>
                                    <span>{formatTime(msg.created_at)}</span>
                                    {isMe && <span>{msg.is_read ? '✓✓' : '✓'}</span>}
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="bg-white p-3 border-t flex items-center gap-2">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full text-xl">📎</button>
                <button onClick={isRecording ? stopRecording : startRecording} className={'p-2 rounded-full text-xl ' + (isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:bg-gray-100')}>🎤</button>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} placeholder="Type a message..." className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:border-blue-500" />
                <button onClick={sendMessage} disabled={!newMessage.trim()} className={'p-2 rounded-full text-xl ' + (newMessage.trim() ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-400')}>➤</button>
            </div>
        </div>
    )
}