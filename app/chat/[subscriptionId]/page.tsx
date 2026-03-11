'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { Send, Paperclip, Mic, Play, Pause, Check, CheckCheck } from 'lucide-react'

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
  const subscriptionId = params.subscriptionId as string
  const supabase: any = createClient()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [otherUserName, setOtherUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Blocked patterns for safety
  const blockedPatterns = [
    /07\d{8}/g,                    // Sri Lankan phone
    /\+94\d{9}/g,                  // +94 phone
    /\d{10,}/g,                    // Any 10+ digit number
    /[\w.-]+@[\w.-]+\.\w+/g,       // Email
    /@[\w]+/g,                     // Social media handles
    /whatsapp/gi,                  // WhatsApp mention
    /telegram/gi,                  // Telegram mention
    /viber/gi,                     // Viber mention
    /call me/gi,                   // Call me
    /contact me/gi,                // Contact me
  ]

  useEffect(() => {
    loadChat()
    setupRealtime()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function loadChat() {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    // Get subscription details to find other user
    const { data: sub }: any = await supabase
      .from('subscriptions')
      .select('student_id, mentor_id')
      .eq('id', subscriptionId)
      .single()

    if (sub) {
      // Find the other person's name
      const otherId = sub.student_id === user.id 
        ? sub.mentor_id 
        : sub.student_id
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', otherId)
        .single()
      
      if (profile) setOtherUserName(profile.full_name)
    }

    // Load messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: true })

    if (msgs) setMessages(msgs)
    
    // Mark messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('subscription_id', subscriptionId)
      .neq('sender_id', user.id)

    setLoading(false)
  }

  function setupRealtime() {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `subscription_id=eq.${subscriptionId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  function checkForBlockedContent(text: string): boolean {
    for (const pattern of blockedPatterns) {
      if (pattern.test(text)) {
        return true
      }
    }
    return false
  }

  async function sendMessage() {
    if (!newMessage.trim() || !currentUserId) return

    // Safety check
    if (checkForBlockedContent(newMessage)) {
      alert('⚠️ For your safety, sharing personal contact information (phone numbers, emails, social media) is not allowed. Please keep all communication within the platform.')
      return
    }

    const { error } = await supabase.from('messages').insert({
      subscription_id: subscriptionId,
      sender_id: currentUserId,
      content: newMessage,
      message_type: 'text',
      is_read: false
    })

    if (!error) {
      setNewMessage('')
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return

    const fileName = `${currentUserId}-${Date.now()}`
    const { data, error } = await supabase.storage
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
        await uploadVoiceMessage(audioBlob)
        stream.getTracks().forEach(track => track.stop())
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

  async function uploadVoiceMessage(blob: Blob) {
    if (!currentUserId) return

    const fileName = `${currentUserId}-${Date.now()}.webm`
    const { error } = await supabase.storage
      .from('voice-messages')
      .upload(fileName, blob)

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

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading chat...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center text-lg">
          {otherUserName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="font-bold">{otherUserName}</h1>
          <p className="text-sm text-blue-200">Your Exam Coach</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl p-3 ${
                  isMe 
                    ? 'bg-blue-500 text-white rounded-br-sm' 
                    : 'bg-white text-gray-800 rounded-bl-sm shadow'
                }`}
              >
                {/* Text Message */}
                {msg.message_type === 'text' && msg.content && (
                  <p>{msg.content}</p>
                )}

                {/* Image Message */}
                {msg.message_type === 'image' && msg.image_url && (
                  <img 
                    src={msg.image_url} 
                    alt="Shared image"
                    className="rounded-lg max-w-full cursor-pointer"
                    onClick={() => window.open(msg.image_url!, '_blank')}
                  />
                )}

                {/* Voice Message */}
                {msg.message_type === 'voice' && msg.voice_url && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const audio = new Audio(msg.voice_url!)
                        if (playingVoice === msg.id) {
                          setPlayingVoice(null)
                        } else {
                          audio.play()
                          setPlayingVoice(msg.id)
                          audio.onended = () => setPlayingVoice(null)
                        }
                      }}
                      className={`p-2 rounded-full ${isMe ? 'bg-blue-400' : 'bg-gray-200'}`}
                    >
                      {playingVoice === msg.id ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <span className="text-sm">Voice message</span>
                  </div>
                )}

                {/* Time and Read Status */}
                <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                  <span>{formatTime(msg.created_at)}</span>
                  {isMe && (
                    msg.is_read 
                      ? <CheckCheck size={14} className="text-blue-200" />
                      : <Check size={14} />
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
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
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
        >
          <Paperclip size={22} />
        </button>

        {/* Voice Recording */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-2 rounded-full ${isRecording ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Mic size={22} />
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:border-blue-500"
        />

        {/* Send Button */}
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  )
}
