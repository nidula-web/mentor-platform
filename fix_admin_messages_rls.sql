-- Execute this in the Supabase Dashboard SQL Editor
-- This will allow the admin email to view all messages in the platform
-- despite Row Level Security being enabled on the messages table.

-- 1. Drop the existing policy if you want to be safe, or just add a new one.
-- Usually student/mentor policies are named something like "Users can view their own messages"

-- 2. Add the Admin override policy
CREATE POLICY "Admins can view all messages" ON public.messages 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = 'nnpinidiya@gmail.com'
  )
);

-- 3. Also allow admin to view all profiles (in case some are hidden)
CREATE POLICY "Admins can view all profiles" ON public.profiles 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = 'nnpinidiya@gmail.com'
  )
);
