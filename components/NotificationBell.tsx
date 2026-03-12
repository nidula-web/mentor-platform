'use client'
// @ts-nocheck
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Notification {
    id: string
    title: string
    message: string
    type: string
    link: string | null
    is_read: boolean
    created_at: string
}

export default function NotificationBell() {
    const supabase: any = createClient()
    const router = useRouter()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const unreadCount = notifications.filter(n => !n.is_read).length

    useEffect(() => {
        loadNotifications()
    }, [])

    async function loadNotifications() {
        const { data: { user } }: any = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) setNotifications(data)

        const channel = supabase
            .channel('notifications-' + user.id)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: 'user_id=eq.' + user.id
                },
                (payload: any) => {
                    const newNotif = payload.new as Notification
                    setNotifications(prev => [newNotif, ...prev])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }

    async function markAsRead(notifId: string) {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notifId)

        setNotifications(prev =>
            prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
        )
    }

    async function markAllAsRead() {
        if (!userId) return

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)

        setNotifications(prev =>
            prev.map(n => ({ ...n, is_read: true }))
        )
    }

    function handleClick(notif: Notification) {
        markAsRead(notif.id)
        setShowDropdown(false)
        if (notif.link) {
            router.push(notif.link)
        }
    }

    // Handle outside click to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false)
            }
        }
        if (showDropdown) {
          document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showDropdown])

    function formatTime(dateString: string) {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (mins < 1) return 'Just now'
        if (mins < 60) return mins + 'm ago'
        if (hours < 24) return hours + 'h ago'
        return days + 'd ago'
    }

    function getIcon(type: string) {
        switch (type) {
            case 'payment': return '💰'
            case 'message': return '💬'
            case 'success': return '✅'
            case 'warning': return '⚠️'
            default: return '🔔'
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 h-10 w-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Notifications"
            >
                <span className="text-xl sm:text-2xl">🔔</span>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown */}
            {showDropdown && (
                <div 
                    className="fixed top-14 left-0 right-0 w-full bg-white border-b shadow-2xl md:absolute md:top-full md:mt-2 md:right-0 md:w-80 md:left-auto md:rounded-2xl md:border md:shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 z-50"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b">
                        <h3 className="font-black text-gray-900 text-sm italic">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-tight"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[70vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-10 text-center text-gray-400">
                                <p className="text-4xl mb-3">🔕</p>
                                <p className="text-xs font-bold uppercase tracking-widest">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleClick(notif)}
                                    className={
                                        'px-4 py-4 min-h-[56px] border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors flex gap-4 ' +
                                        (!notif.is_read ? 'bg-blue-50/50' : '')
                                    }
                                >
                                    <span className="text-2xl shrink-0">{getIcon(notif.type)}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className={
                                                'text-sm leading-tight ' +
                                                (!notif.is_read ? 'font-black text-gray-900' : 'text-gray-700 font-medium')
                                            }>
                                                {notif.title}
                                            </p>
                                            {!notif.is_read && (
                                                <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1"></span>
                                            )}
                                        </div>
                                        <p className="text-[13px] text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                                            {notif.message}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider">
                                            {formatTime(notif.created_at)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
