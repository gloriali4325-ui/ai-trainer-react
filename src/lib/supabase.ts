import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://wqdzhtqoxsfymahtjhgv.supabase.co';
const fallbackKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZHpodHFveHNmeW1haHRqaGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzAzODMsImV4cCI6MjA4NDcwNjM4M30.JJwbPiFryeFJvqb-ZXMYeGXgGA2ATOSgWrvHi-Wj50k';

const supabaseUrl = typeof import.meta !== 'undefined' && typeof (import.meta as any).env !== 'undefined' 
  ? (import.meta as any).env.VITE_SUPABASE_URL || fallbackUrl
  : fallbackUrl;
const supabaseAnonKey = typeof import.meta !== 'undefined' && typeof (import.meta as any).env !== 'undefined'
  ? (import.meta as any).env.VITE_SUPABASE_ANON_KEY || fallbackKey
  : fallbackKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
