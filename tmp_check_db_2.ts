import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  const { count: subCount } = await supabase.from("subscriptions").select("*", { count: 'exact', head: true });
  console.log("Subscription count:", subCount);

  const { data: subs } = await supabase.from("subscriptions").select("*");
  console.log("All Subscriptions:", subs);

  const { data: messages } = await supabase.from("messages").select("subscription_id").limit(5);
  console.log("Sample message sub IDs:", messages);
}

check();
