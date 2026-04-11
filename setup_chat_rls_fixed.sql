-- Fix Complete Chat Messaging RLS Issues
-- Run this in your Supabase SQL Editor

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop all possible conflicting policies on messages
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their chat messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view subscription messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert chat messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all messages v2" ON public.messages;

-- 1. SELECT Policy: Students, Mentors, and Sender can view their messages
CREATE POLICY "Users can view subscription messages" ON public.messages
FOR SELECT
USING (
  -- The user is the sender
  auth.uid() = sender_id 
  OR 
  -- The user is part of the subscription
  EXISTS (
    SELECT 1 FROM public.subscriptions sub
    LEFT JOIN public.mentors men ON sub.mentor_id = men.id
    WHERE sub.id = messages.subscription_id
    AND (
      sub.student_id = auth.uid() OR men.user_id = auth.uid()
    )
  )
);

-- 2. INSERT Policy: Students and Mentors can send messages
CREATE POLICY "Users can insert chat messages" ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.subscriptions sub
    LEFT JOIN public.mentors men ON sub.mentor_id = men.id
    WHERE sub.id = messages.subscription_id
    AND (
      sub.student_id = auth.uid() OR men.user_id = auth.uid()
    )
  )
);

-- 3. SELECT + ALL Admin Policy
CREATE POLICY "Admins can view all messages v2" ON public.messages 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND LOWER(auth.users.email) = LOWER('nnpinidiya@gmail.com')
  )
);

-- 4. Ensure Realtime is enabled for the messages table!
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END
$$;
