-- Create affiliates table
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  bank_name TEXT,
  branch_name TEXT,
  account_number TEXT,
  account_name TEXT,
  total_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for affiliates
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own affiliate row" ON public.affiliates FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own affiliate row" ON public.affiliates FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own affiliate row" ON public.affiliates FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Public read for referral code" ON public.affiliates FOR SELECT USING (true);

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  referred_student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates can view their own referrals" ON public.referrals FOR SELECT USING (auth.uid() = affiliate_id);
CREATE POLICY "Anyone can insert referral" ON public.referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all referrals" ON public.referrals FOR SELECT USING (true); -- For simplicity in admin panel

-- Create affiliate earnings table
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for affiliate_earnings
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates can view their own earnings" ON public.affiliate_earnings FOR SELECT USING (auth.uid() = affiliate_id);
CREATE POLICY "Admins can insert and view earnings" ON public.affiliate_earnings FOR ALL USING (true);

