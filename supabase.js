import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente.");
}

export const supabase = createClient(url || "http://localhost", key || "missing");
