import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://chdwyxrnuscbdkfqymtd.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZHd5eHJudXNjYmRrZnF5bXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MDg0MjQsImV4cCI6MjEwNjE4NDQyNH0.4P22zdIrr56WpB5iZIW_nXx0fr1JCXrayLFDrjP2qxk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  email: string
  full_name: string | null
  job_title: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type UserSettings = {
  id: string
  user_id: string
  theme: 'light' | 'dark' | 'system'
  default_tone: 'Professional' | 'Friendly' | 'Persuasive' | 'Apologetic'
  auto_append_signature: boolean
  signature_text: string
  updated_at: string
}

export type EmailGeneration = {
  id: string
  user_id: string
  draft: string
  tone: 'Professional' | 'Friendly' | 'Persuasive' | 'Apologetic'
  result: string
  subject?: string | null
  recipient?: string | null
  word_count: number
  char_count: number
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export type Template = {
  id: string
  user_id?: string | null
  title: string
  content: string
  category: string
  is_system: boolean
  created_at: string
}

export type EmailFeedback = {
  id: string
  generation_id: string
  user_id: string
  is_helpful: boolean
  feedback_text?: string | null
  created_at: string
}
