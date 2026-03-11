
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSchema() {
  const { data, error } = await supabase
    .from("mentors")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error fetching mentors:", error);
  } else {
    console.log("Mentors columns:", Object.keys(data[0] || {}));
  }
}

checkSchema();
