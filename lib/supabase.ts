'use client'
// @ts-nocheck

import { createBrowserClient } from '@supabase/ssr'

let supabaseInstance = null

export function createClient() {
  if (typeof window === 'undefined') {
    return null
  }
  
  if (supabaseInstance) {
    return supabaseInstance
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing Supabase credentials')
    return null
  }

  supabaseInstance = createBrowserClient(url, key)
  return supabaseInstance
}
