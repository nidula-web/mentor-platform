-- Execute this in the Supabase Dashboard SQL Editor
-- This version is more robust and handles case sensitivity.

-- 1. DROP old policies if they exist (optional but good practice)
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all messages v2" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all profiles v2" ON public.profiles;

-- 2. Add THE ROBUST Admin override policy (Case-Insensitive)
CREATE POLICY "Admins can view all messages v2" ON public.messages 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND LOWER(auth.users.email) = LOWER('nnpinidiya@gmail.com')
  )
);

CREATE POLICY "Admins can view all profiles v2" ON public.profiles 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND LOWER(auth.users.email) = LOWER('nnpinidiya@gmail.com')
  )
);

-- Note: Ensure ROW LEVEL SECURITY is ENABLED
-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

