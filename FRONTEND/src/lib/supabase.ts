import { createClient } from "@supabase/supabase-js";

export const SUPABASE_STORAGE_KEY = "kareerist-auth";
export const SUPABASE_CODE_VERIFIER_KEY = `${SUPABASE_STORAGE_KEY}-code-verifier`;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseOAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseOAuthConfigured
    ? createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
            flowType: "pkce",
            detectSessionInUrl: false,
            persistSession: true,
            autoRefreshToken: false,
            storageKey: SUPABASE_STORAGE_KEY,
        },
    })
    : null;
