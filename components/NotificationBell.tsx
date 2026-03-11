'use client'
// @ts-nocheck
import { useEffect, useState } from 'react'
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

    const unreadCount = notifications.filter(n => !n.is_read).length

    useEffect(() => {
        loadNotifications()
    }, [])

    async function loadNotifications() {
        const { data: { user } }: any = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        // Load notifications
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) setNotifications(data)

        // Listen for new notifications
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
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-2xl hover:bg-gray-100 rounded-full"
            >
                🔔
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    {/* Header */}
                    <div className="flex justify-between items-center p-3 border-b">
                        <h3 className="font-bold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">
                                <p className="text-3xl mb-2">🔕</p>
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleClick(notif)}
                                    className={
                                        'p-3 border-b cursor-pointer hover:bg-gray-50 ' +
                                        (!notif.is_read ? 'bg-blue-50' : '')
                                    }
                                >
                                    <div className="flex gap-3">
                                        <span className="text-xl">{getIcon(notif.type)}</span>
                                        <div className="flex-1">
                                            <p className={
                                                'text-sm ' +
                                                (!notif.is_read ? 'font-bold text-gray-900' : 'text-gray-700')
                                            }>
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {notif.message}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatTime(notif.created_at)}
                                            </p>
                                        </div>
                                        {!notif.is_read && (
                                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                                        )}
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
