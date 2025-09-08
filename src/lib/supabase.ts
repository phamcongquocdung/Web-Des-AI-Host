import { createClient } from "@supabase/supabase-js";

const url = (process as any).env?.REACT_APP_SUPABASE_URL as string;
const anon = (process as any).env?.REACT_APP_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anon);
