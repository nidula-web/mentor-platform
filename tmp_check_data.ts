import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  const { data: subs, error: subError } = await supabase.from("subscriptions").select("*").limit(1);
  if (subError) console.error("Sub error:", subError);
  else console.log("Subscription:", subs?.[0]);

  const { data: mentors, error: mentorError } = await supabase.from("mentors").select("*").limit(1);
  if (mentorError) console.error("Mentor error:", mentorError);
  else console.log("Mentor:", mentors?.[0]);

  const { data: profiles, error: profileError } = await supabase.from("profiles").select("*").limit(1);
  if (profileError) console.error("Profile error:", profileError);
  else console.log("Profile:", profiles?.[0]);
}

check();
