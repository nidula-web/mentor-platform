import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSchema() {
  console.log("--- Profiles ---");
  const { data: profiles } = await supabase.from("profiles").select("*").limit(1);
  console.log("Profile data:", profiles?.[0]);

  console.log("\n--- Subscriptions ---");
  const { data: subs } = await supabase.from("subscriptions").select("*").limit(1);
  console.log("Subscription data:", subs?.[0]);

  console.log("\n--- Mentors ---");
  const { data: mentors } = await supabase.from("mentors").select("*").limit(1);
  console.log("Mentor data:", mentors?.[0]);
}

checkSchema();
