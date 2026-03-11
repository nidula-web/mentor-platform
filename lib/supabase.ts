import { createBrowserClient } from '@supabase/ssr'

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return supabaseInstance
}

export type Profile = {
  id: string;
  full_name: string;
  profile_picture: string | null;
  role?: string;
}

export type Mentor = {
  id: string;
  user_id: string;
  university: string;
  al_stream: string;
  subjects: string[];
  bio: string;
  z_score: number | null;
  exam_type?: string;
  is_verified: boolean;
  max_students: number;
  current_student_count: number;
  results?: any;
  exam_year?: number;
  index_number?: string;
  languages?: string[];
  share_code: string;
}

export type Subscription = {
  id: string;
  student_id: string;
  mentor_id: string;
  status: string;
  amount_paid: number;
  payment_proof_url: string | null;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
}

