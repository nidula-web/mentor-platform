'use client'
// @ts-nocheck
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Message {
  id: string
  subscription_id: string
  sender_id: string
  content: string | null
  image_url: string | null
  voice_url: string | null
  message_type: 'text' | 'image' | 'voice'
  is_read: boolean
  created_at: string
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const subscriptionId = params.subscriptionId as string
  const supabase: any = createClient()

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)

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
    /number eka/i,
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

  function isBlocked(text: string): boolean {
    for (const pattern of blockedPatterns) {
      if (pattern.test(text)) {
        return true
      }
    }
    return false
  }

  async function loadChat() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      // Get subscription
      const { data: sub, error: subError } = await (supabase
        .from('subscriptions'))
        .select('*, mentor_id, student_id')
        .eq('id', subscriptionId)
        .single()

      console.log('Subscription found:', sub)

      if (!sub) {
        console.log('No subscription found:', subError)
        setLoading(false)
        return
      }
      setSubscription(sub)

      // Figure out who is the other person
      const isStudent = sub.student_id === user.id

      if (isStudent) {
        // I am student, find coach info
        const { data: mentor } = await (supabase
          .from('mentors'))
          .select('user_id')
          .eq('id', sub.mentor_id)
          .single()

        if (mentor) {
          const { data: profile } = await (supabase
            .from('profiles'))
            .select('id, full_name, profile_picture, is_online, last_seen')
            .eq('id', mentor.user_id)
            .single()

          if (profile) setOtherUser({ ...profile, role: 'Your Exam Coach' })
        }
      } else {
        // I am the coach, find student info
        const { data: profile } = await (supabase
          .from('profiles'))
          .select('id, full_name, profile_picture, is_online, last_seen')
          .eq('id', sub.student_id)
          .single()

        if (profile) setOtherUser({ ...profile, role: 'Your Student' })
      }

      // Listen for other user's presence changes
      const otherUserId = isStudent ? (await (supabase.from('mentors').select('user_id').eq('id', sub.mentor_id).single())).data?.user_id : sub.student_id;
      
      const presenceChannel = supabase
        .channel('presence-updates-' + subscriptionId)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: 'id=eq.' + otherUserId
          },
          (payload: any) => {
            setOtherUser((prev: any) => ({
              ...prev,
              is_online: payload.new.is_online,
              last_seen: payload.new.last_seen
            }))
          }
        )
        .subscribe()


      // Load messages
      const { data: msgs } = await (supabase
        .from('messages'))
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('created_at', { ascending: true })

      if (msgs) setMessages(msgs)

      // Mark other persons messages as read
      await (supabase
        .from('messages'))
        .update({ is_read: true })
        .eq('subscription_id', subscriptionId)
        .neq('sender_id', user.id)

      // Setup realtime
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
            const newMsg = payload.new as Message
            setMessages(prev => [...prev, newMsg])

            // Auto mark as read if I am viewing
            if (newMsg.sender_id !== user.id) {
              (supabase
                .from('messages'))
                .update({ is_read: true })
                .eq('id', newMsg.id)
                .then()
            }
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

    if (isBlocked(newMessage)) {
      setBlocked(true)
      setTimeout(() => setBlocked(false), 3000)
      return
    }

    const { error } = await (supabase.from('messages')).insert({
      subscription_id: subscriptionId,
      sender_id: currentUserId,
      content: newMessage.trim(),
      message_type: 'text',
      is_read: false
    })

    if (!error) setNewMessage('')
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return

    const fileName = currentUserId + '-' + Date.now() + '-' + file.name

    const { error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      alert('Failed to upload image. Try again.')
      return
    }

    const { data: urlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName)

    console.log('Image URL:', urlData.publicUrl)

    await (supabase.from('messages')).insert({
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
        const { error: uploadError } = await supabase.storage
          .from('voice-messages')
          .upload(fileName, audioBlob)

        if (uploadError) {
          console.error('Voice upload error:', uploadError)
          alert('Failed to upload voice message')
          return
        }

        const { data: urlData } = supabase.storage
          .from('voice-messages')
          .getPublicUrl(fileName)

        await (supabase.from('messages')).insert({
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
      alert('Could not access microphone. Please allow microphone access.')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  function formatTime(dateString: string) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  function formatLastSeen(dateString: string) {
    if (!dateString) return 'Offline'
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins} mins ago`
    if (hours < 24) return `${hours} hours ago`
    
    // Check if it was yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = yesterday.toDateString() === date.toDateString()
    
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    
    if (isYesterday) return `Yesterday at ${timeStr}`
    
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${timeStr}`
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
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 p-2 sm:p-3 px-3 sm:px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => router.push(otherUser?.role === 'Your Student' ? '/mentor/dashboard' : '/student/dashboard')} 
            className="p-1 text-2xl text-gray-400 hover:text-blue-600 transition-colors"
          >
            ←
          </button>
          
          <div className="relative">
            <div className="w-[38px] h-[38px] sm:w-[45px] sm:h-[45px] rounded-full overflow-hidden bg-blue-100 border border-gray-50 shadow-inner flex items-center justify-center">
              {otherUser?.profile_picture ? (
                <img src={otherUser.profile_picture} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-lg sm:text-xl font-bold text-blue-600">
                  {otherUser?.full_name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {otherUser?.is_online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
 
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-bold text-gray-900 leading-tight truncate max-w-[120px] sm:max-w-none">
                {otherUser?.full_name}
              </h1>
              {otherUser?.is_online && (
                <span className="shrink-0 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  Online
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs font-medium text-gray-500 truncate">{otherUser?.role}</p>
          </div>
        </div>

        {!otherUser?.is_online && otherUser?.last_seen && (
          <div className="text-right shrink-0">
            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Last Seen</p>
            <p className="text-[10px] sm:text-xs font-bold text-gray-600">{formatLastSeen(otherUser.last_seen)}</p>
          </div>
        )}
      </div>


      {/* Safety Warning */}
      {blocked && (
        <div className="bg-blue-600 text-white p-3 text-center text-sm font-bold shadow-lg animate-bounce">
          🛡️ We protect your safety by keeping all communication within the platform. Please keep your personal contact info private.
        </div>
      )}

      {/* Messages */}
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
            <div
              key={msg.id}
              className={'flex ' + (isMe ? 'justify-end' : 'justify-start')}
            >
              <div
                className={
                  'max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 ' +
                  (isMe
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm shadow')
                }
              >
                {/* Text */}
                {msg.message_type === 'text' && msg.content && (
                  <p className="break-words">{msg.content}</p>
                )}

                {/* Image */}
                {msg.message_type === 'image' && msg.image_url && (
                  <img
                    src={msg.image_url}
                    alt="Shared"
                    className="rounded-lg max-w-full max-h-60 cursor-pointer"
                    onClick={() => window.open(msg.image_url!, '_blank')}
                  />
                )}

                {/* Voice */}
                {msg.message_type === 'voice' && msg.voice_url && (
                  <div className="flex items-center gap-2">
                    <span className="text-xl shrink-0">🎤</span>
                    <audio controls className="max-w-[160px] sm:max-w-[200px] h-8">
                      <source src={msg.voice_url} type="audio/webm" />
                    </audio>
                  </div>
                )}

                {/* Time and Read Status */}
                <div
                  className={
                    'flex items-center justify-end gap-1 mt-1 text-xs ' +
                    (isMe ? 'text-blue-100' : 'text-gray-400')
                  }
                >
                  <span>{formatTime(msg.created_at)}</span>
                  {isMe && (
                    <span>
                      {msg.is_read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {subscription?.status === 'expired' ? (
        <div className="bg-gray-50 p-6 border-t border-gray-200 text-center">
          <div className="mb-3 text-amber-600">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <p className="font-bold">Your 30-day coaching period has ended.</p>
            <p className="text-sm">Renew your subscription to continue chatting with your coach.</p>
          </div>
          <Link
            href={`/subscribe/${subscription.mentor_id}`}
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all"
          >
            Renew Subscription
          </Link>
        </div>
      ) : (
        <div className="bg-white p-3 border-t flex items-center gap-2">
          {/* Image Upload */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full text-xl"
            title="Send image"
          >
            📎
          </button>

          {/* Voice Recording */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={
              'p-2 rounded-full text-xl ' +
              (isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'text-gray-500 hover:bg-gray-100')
            }
            title={isRecording ? 'Stop recording' : 'Record voice message'}
          >
            🎤
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Type a message..."
            className="flex-1 min-w-0 border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />

          {/* Send Button */}
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className={
              'p-2 shrink-0 rounded-full text-xl ' +
              (newMessage.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400')
            }
          >
            ➤
          </button>
        </div>
      )}
    </div>
  )
}