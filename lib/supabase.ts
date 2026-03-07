import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// Database types
export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  profile_picture: string | null
}

export interface Mentor {
  id: string
  user_id: string
  exam_type: string | null
  al_stream: string | null
  index_number: string | null
  exam_year: number | null
  subjects: string[]
  results: Record<string, unknown> | null
  university: string | null
  degree_program: string | null
  z_score: number | null
  bio: string | null
  languages: string[]
  is_verified: boolean
  max_students: number
  current_student_count: number
}

export interface Subscription {
  id: string
  student_id: string
  mentor_id: string
  status: string
  payment_proof_url: string | null
  started_at: string | null
  expires_at: string | null
  amount_paid: number | null
}

export interface Message {
  id: string
  subscription_id: string
  sender_id: string
  content: string
  image_url: string | null
  message_type: string
  is_read: boolean
  created_at: string
}

export interface Review {
  id: string
  subscription_id: string
  student_id: string
  mentor_id: string
  rating: number
  comment: string | null
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile }
      mentors: { Row: Mentor }
      subscriptions: { Row: Subscription }
      messages: { Row: Message }
      reviews: { Row: Review }
    }
  }
}

export function createClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)
}
