'use client'
// @ts-nocheck
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

function VoicePlayer({ msgId, url, isMe }) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current
    if (!audio) return
    const percent = (audio.currentTime / audio.duration) * 100
    setProgress(percent)
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current
    if (!audio) return
    setDuration(Math.floor(audio.duration))
  }

  function handleEnded() {
    setIsPlaying(false)
    setProgress(0)
  }

  function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins + ':' + (secs < 10 ? '0' : '') + secs
  }

  return (
    <div className="flex items-center gap-3 min-w-[200px] py-1">
      <button
        onClick={togglePlay}
        className={'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ' +
          (isMe 
            ? 'bg-blue-400 text-white hover:bg-blue-300' 
            : 'bg-gray-300 text-gray-700 hover:bg-gray-400')}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      
      <div className="flex-1 flex flex-col gap-1">
        <div className={'h-1.5 rounded-full overflow-hidden ' + 
          (isMe ? 'bg-blue-300' : 'bg-gray-300')}>
          <div 
            className={'h-full rounded-full transition-all duration-100 ' + 
              (isMe ? 'bg-white' : 'bg-blue-500')}
            style={{ width: progress + '%' }}
          />
        </div>
        <span className={'text-xs ' + (isMe ? 'text-blue-100' : 'text-gray-400')}>
          {formatDuration(duration)}
        </span>
      </div>
      
      <span className="text-lg">🎤</span>
      
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      >
        <source src={url} type="audio/webm" />
      </audio>
    </div>
  )
}

export default function ChatPage() {
    const params = useParams()
    const router = useRouter()
    const subscriptionId = params.subscriptionId
    const supabase = createClient()

    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [otherUserName, setOtherUserName] = useState('Loading...')
    const [otherUserPicture, setOtherUserPicture] = useState(null)
    const [isOnline, setIsOnline] = useState(false)
    const [lastSeen, setLastSeen] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isRecording, setIsRecording] = useState(false)
    const [recordingDuration, setRecordingDuration] = useState(0)
    const [blocked, setBlocked] = useState(false)
    const [viewingImage, setViewingImage] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [recordingUploading, setRecordingUploading] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const timerRef = useRef<any>(null)

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
        const navbar = document.querySelector('nav')
        if (navbar) navbar.style.display = 'none'
        return () => {
            if (navbar) navbar.style.display = ''
        }
    }, [])

    useEffect(() => {
        loadChat()
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        if (isRecording) {
            setRecordingDuration(0)
            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1)
            }, 1000)
        } else {
            clearInterval(timerRef.current)
        }
        return () => clearInterval(timerRef.current)
    }, [isRecording])

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }

    function isBlockedContent(text: string) {
        for (const pattern of blockedPatterns) {
            if (pattern.test(text)) return true
        }
        return false
    }

    function formatLastSeen(dateString) {
        if (!dateString) return ''
        const now = new Date()
        const date = new Date(dateString)
        const diff = now.getTime() - date.getTime()
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins}m ago`
        if (hours < 24) return `${hours}h ago`
        
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    function formatRecordingTime(seconds: number) {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s < 10 ? '0' : ''}${s}`
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
                let otherUserId = isStudent ? null : sub.student_id

                if (isStudent) {
                    const { data: mentor } = await supabase
                        .from('mentors')
                        .select('user_id')
                        .eq('id', sub.mentor_id)
                        .single()
                    if (mentor) otherUserId = mentor.user_id
                }

                if (otherUserId) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, profile_picture, is_online, last_seen')
                        .eq('id', otherUserId)
                        .single()

                    if (profile) {
                        setOtherUserName(profile.full_name)
                        setOtherUserPicture(profile.profile_picture)
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
            
            if (msgs) {
                setMessages(msgs)
            }

            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('subscription_id', subscriptionId)
                .neq('sender_id', user.id)

            supabase
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
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'messages',
                        filter: 'subscription_id=eq.' + subscriptionId
                    },
                    (payload: any) => {
                        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
                    }
                )
                .subscribe()

            setLoading(false)
        } catch (err) {
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

        const msgContent = newMessage.trim()
        setNewMessage('')

        await supabase.from('messages').insert({
            subscription_id: subscriptionId,
            sender_id: currentUserId,
            content: msgContent,
            message_type: 'text',
            is_read: false
        })
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file || !currentUserId) return

        setUploading(true)
        const fileName = `${currentUserId}-${Date.now()}-${file.name}`
        const { error } = await supabase.storage
            .from('chat-images')
            .upload(fileName, file)

        if (error) {
            alert('Failed to upload image')
            setUploading(false)
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

        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                stream.getTracks().forEach(track => track.stop())

                setRecordingUploading(true)
                const fileName = `${currentUserId}-${Date.now()}.webm`
                const { error: uploadError } = await supabase.storage
                    .from('voice-messages')
                    .upload(fileName, audioBlob, {
                        contentType: 'audio/webm',
                        cacheControl: '3600',
                    })

                if (uploadError) {
                    console.error('Voice upload error:', uploadError)
                    alert('Failed to send voice message. Try again.')
                    setRecordingUploading(false)
                    return
                }

                const { data: urlData } = supabase.storage
                    .from('voice-messages')
                    .getPublicUrl(fileName)

                const { error: msgError } = await supabase.from('messages').insert({
                    subscription_id: subscriptionId,
                    sender_id: currentUserId,
                    voice_url: urlData.publicUrl,
                    message_type: 'voice',
                    is_read: false
                })

                if (msgError) {
                    console.error('Voice message insert error:', msgError)
                    alert('Failed to send voice message')
                }

                setRecordingUploading(false)
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
            <div className="h-screen flex items-center justify-center bg-gray-100" style={{ height: '100dvh' }}>
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="flex flex-col bg-[#e5ddd5]" style={{ height: '100dvh' }}>
            {/* Header - Fixed */}
            <div className="flex-shrink-0 h-16 bg-white shadow-sm flex items-center px-2 py-3 z-50">
                <button onClick={() => router.back()} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full active:scale-90 transition-all">
                    <span className="text-xl">←</span>
                </button>
                
                <div className="flex items-center flex-1 ml-1 gap-3 overflow-hidden">
                    <div className="relative flex-shrink-0">
                        {otherUserPicture ? (
                            <img src={otherUserPicture} alt="" className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-100" />
                        ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm">
                                {otherUserName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        {isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                        <h1 className="font-bold text-[#111b21] text-[16px] truncate leading-tight">
                            {otherUserName}
                        </h1>
                        <div className="flex items-center gap-1">
                            {isOnline ? (
                                <span className="text-[12px] text-green-600 font-medium">Online</span>
                            ) : (
                                <span className="text-[12px] text-slate-500 truncate">
                                    {lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : 'Offline'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-all">
                        <span className="text-xl">⋮</span>
                    </button>
                </div>
            </div>

            {/* Blocked warning */}
            {blocked && (
                <div className="flex-shrink-0 bg-red-500 text-white p-2 text-center text-sm shadow-md z-40">
                    🔒 Your privacy is protected on ExamCoach
                </div>
            )}

            {/* Messages Area - SCROLLABLE */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-2 scroll-smooth">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                        <span className="text-6xl mb-4">👋</span>
                        <p className="font-medium text-center px-4">Say hello to your {otherUserName}!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId
                        return (
                            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`relative max-w-[85%] px-2 py-1.5 shadow-sm min-w-[80px] ${
                                    isMe 
                                    ? 'bg-[#dcf8c6] rounded-2xl rounded-tr-none' 
                                    : 'bg-white rounded-2xl rounded-tl-none'
                                }`}>
                                    {msg.message_type === 'text' && (
                                        <p className="text-[14.5px] text-[#111b21] leading-relaxed break-words pr-12">
                                            {msg.content}
                                        </p>
                                    )}

                                    {msg.message_type === 'image' && (
                                        <div className="mb-4 mt-1">
                                            <img 
                                                src={msg.image_url} 
                                                alt="" 
                                                className="rounded-lg max-w-[250px] max-h-[300px] object-cover cursor-pointer hover:opacity-95 transition-all" 
                                                onClick={() => setViewingImage(msg.image_url)}
                                            />
                                        </div>
                                    )}

                                    {msg.message_type === 'voice' && msg.voice_url && (
                                        <VoicePlayer msgId={msg.id} url={msg.voice_url} isMe={isMe} />
                                    )}

                                    <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                        <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                                            {formatTime(msg.created_at)}
                                        </span>
                                        {isMe && (
                                            <span className={`text-[12px] font-bold ${msg.is_read ? 'text-blue-500' : 'text-slate-400'}`}>
                                                {msg.is_read ? '✓✓' : '✓'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} className="h-px" />
                
                {uploading && (
                    <div className="flex justify-end mt-2 animate-pulse">
                        <div className="bg-blue-50 rounded-2xl p-2 max-w-[75%] shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="text-lg">⏳</div>
                                <span className="text-xs text-blue-600 font-bold">Sending image...</span>
                            </div>
                        </div>
                    </div>
                )}

                {recordingUploading && (
                    <div className="flex justify-end mt-2 animate-pulse">
                        <div className="bg-blue-50 rounded-2xl p-2 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="text-lg">⏳</div>
                                <span className="text-xs text-blue-600 font-bold">Sending voice...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area - ALWAYS VISIBLE */}
            <div className="flex-shrink-0 bg-white border-t p-2 flex items-center gap-2 z-50"
                 style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
                
                <input type="file" accept="image/*" ref={fileInputRef} 
                       onChange={handleImageUpload} className="hidden" />
                
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={uploading}
                    className={`w-10 h-10 flex-shrink-0 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full text-xl ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    📎
                </button>

                <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={'w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full text-xl ' + 
                               (isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-gray-500 hover:bg-gray-100')}
                >
                    {isRecording ? '■' : '🎤'}
                </button>

                <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { 
                        if (e.key === 'Enter' && !e.shiftKey) { 
                            e.preventDefault(); 
                            sendMessage() 
                        }
                    }}
                    placeholder={isRecording ? `Recording ${formatRecordingTime(recordingDuration)}...` : "Type a message..."}
                    disabled={isRecording}
                    className="flex-1 min-w-0 border rounded-[24px] px-4 py-2 text-[15px] focus:outline-none focus:border-blue-500 bg-[#f0f2f5] min-h-[40px] text-gray-900 disabled:opacity-75 disabled:bg-red-50 disabled:border-red-200" 
                />

                <button 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim() || isRecording}
                    className={'w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full text-xl ' + 
                               (newMessage.trim() && !isRecording ? 'bg-blue-500 text-white shadow-md active:scale-95 transition-transform' : 'bg-gray-200 text-gray-400')}
                >
                    ➤
                </button>
            </div>

            {viewingImage && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex items-center justify-center"
                    onClick={() => setViewingImage(null)}
                >
                    <button 
                        className="absolute top-4 right-4 text-white text-3xl z-[110]"
                        onClick={() => setViewingImage(null)}
                    >
                        ✕
                    </button>
                    <img 
                        src={viewingImage} 
                        alt="Full view"
                        className="max-w-full max-h-full object-contain p-4"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            <style jsx global>{`
                body {
                    overflow: hidden;
                    position: fixed;
                    width: 100%;
                    height: 100%;
                }
                ::-webkit-scrollbar {
                    width: 4px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(0,0,0,0.1);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    )
}