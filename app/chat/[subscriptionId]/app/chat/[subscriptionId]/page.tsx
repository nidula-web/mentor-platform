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

    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [currentUserId, setCurrentUserId] = useState(null)
    const [otherUserName, setOtherUserName] = useState('Loading...')
    const [loading, setLoading] = useState(true)
    const [isRecording, setIsRecording] = useState(false)
    const [blocked, setBlocked] = useState(false)

    const messagesEndRef = useRef(null)
    const fileInputRef = useRef(null)
    const mediaRecorderRef = useRef(null)
    const audioChunksRef = useRef([])

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

    function isBlockedContent(text) {
        for (const pattern of blockedPatterns) {
            if (pattern.test(text)) {
                return true
            }
        }
        return false
    }

    async function loadChat() {
        try {
            const { data } = await supabase.auth.getUser()
            const user = data?.user
            if (!user) {
                router.push('/login')
                return
            }
            setCurrentUserId(user.id)

            const { data: sub } = await supabase
                .from('subscriptions')
                .select('student_id, mentor_id')
                .eq('id', subscriptionId)
                .single()

            if (sub) {
                const isStudent = sub.student_id === user.id

                if (isStudent) {
                    const { data: mentor } = await supabase
                        .from('mentors')
                        .select('user_id')
                        .eq('id', sub.mentor_id)
                        .single()

                    if (mentor) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('full_name')
                            .eq('id', mentor.user_id)
                            .single()

                        if (profile) setOtherUserName(profile.full_name)
                    }
                } else {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', sub.student_id)
                        .single()

                    if (profile) setOtherUserName(profile.full_name)
                }
            }

            const { data: msgs } = await supabase
                .from('messages')
                .select('*')
                .eq('subscription_id', subscriptionId)
                .order('created_at', { ascending: true })

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
                    (payload) => {
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

    async function handleImageUpload(e) {
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

    function formatTime(dateString) {
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
        <div className="flex flex-col h-screen bg-gray-100">
            <div className="bg-blue-600 text-white p-4 flex items-center gap-3 shadow-md">
                <button onClick={() => router.back()} className="text-2xl">
                    ←
                </button>
                <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center text-lg font-bold">
                    {otherUserName.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h1 className="font-bold text-lg">{otherUserName}</h1>
                    <p className="text-sm text-blue-200">Exam Coach</p>
                </div>
            </div>

            {blocked && (
                <div className="bg-red-500 text-white p-3 text-center text-sm">
                    🔒 For your privacy and security, personal contact details are automatically protected on ExamCoach.
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10">
                        <p className="text-4xl mb-2">👋</p>
                        <p>Say hello to your Exam Coach!</p>
                    </div>
                )}

                {messages.map((msg) => {
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