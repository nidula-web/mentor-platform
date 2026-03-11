"use client"
// @ts-nocheck

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function PresenceTracker() {
    const supabase = createClient()

    useEffect(() => {
        let userId: string | null = null

        async function updateStatus(online: boolean) {
            if (!userId) {
                const { data: { user } }: any = await supabase.auth.getUser()
                if (user) userId = user.id
            }

            if (userId) {
                await supabase
                    .from('profiles')
                    .update({ 
                        is_online: online,
                        last_seen: new Date().toISOString()
                    })
                    .eq('id', userId)
            }
        }

        // Initialize status
        updateStatus(true)

        // Heartbeat every 30 seconds
        const interval = setInterval(() => updateStatus(true), 30000)

        // Handle tab close
        const handleUnload = () => {
            // Use navigator.sendBeacon or a synchronous fetch if possible for better reliability,
            // but for simplicity with Supabase client we use the updateStatus.
            // Note: Modern browsers might throttle this.
            updateStatus(false)
        }

        window.addEventListener('beforeunload', handleUnload)

        return () => {
            clearInterval(interval)
            window.removeEventListener('beforeunload', handleUnload)
            updateStatus(false)
        }
    }, [])

    return null // This component doesn't render anything
}

