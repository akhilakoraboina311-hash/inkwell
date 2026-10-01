'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  Copy,
  FileText,
  History,
  Home,
  LogIn,
  LogOut,
  Mail,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Sun,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User as UserIcon,
  WandSparkles,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase, type Profile, type UserSettings } from '@/lib/supabase'

const USE_MOCK = false

const tones = [
  { name: 'Professional', icon: '◼', color: 'from-rose-400 to-orange-400' },
  { name: 'Friendly', icon: '☺', color: 'from-amber-300 to-yellow-500' },
  { name: 'Persuasive', icon: '↗', color: 'from-orange-400 to-red-400' },
  { name: 'Apologetic', icon: '♡', color: 'from-pink-400 to-rose-500' },
]

const fallbackTemplates: [string, string][] = [
  ['Follow-up', 'Hi there,\n\nI wanted to follow up on our conversation and see if you had a chance to review the information I shared.'],
  ['Meeting request', 'Hi there,\n\nI would love to schedule a brief meeting to discuss this further. Are you available this week?'],
  ['Thank you', 'Hi there,\n\nThank you so much for your time and thoughtful help. I really appreciate it.'],
  ['Job application', 'Dear Hiring Team,\n\nI am excited to apply for this opportunity. My experience would make me a strong addition to your team.'],
]

type HistoryItem = {
  id: string | number
  tone: string
  draft: string
  result: string
  date: string
  word_count?: number
  created_at?: string
}

const initialStarterHistory: HistoryItem[] = [
  {
    id: 'starter-1',
    tone: 'Professional',
    draft: 'Just checking in about the proposal. Let me know what you think.',
    result: 'I wanted to follow up on the proposal I shared. When you have a moment, I would appreciate hearing your thoughts.',
    date: 'Today, 9:42 AM',
    word_count: 12,
  },
  {
    id: 'starter-2',
    tone: 'Friendly',
    draft: 'Thanks for helping me with this! It was really useful.',
    result: 'Thank you so much for your help with this. Your guidance was incredibly useful, and I really appreciate your time!',
    date: 'Yesterday, 3:18 PM',
    word_count: 10,
  },
]

function inferRecipient(draft: string) {
  const match = draft.match(/^(?:hi|hello|hey|dear)\s+([^,!\n]+)/i)
  return match?.[1]?.trim() || 'there'
}

function inferRecipientEmail(draft: string) {
  const match = draft.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/)
  return match?.[1] || ''
}

function parseEmailSubjectAndBody(text: string) {
  if (!text) return { subject: '', body: '' }
  const subjectMatch = text.match(/^Subject:\s*(.*)/im)
  if (subjectMatch) {
    const subject = subjectMatch[1].trim()
    const body = text.replace(/^Subject:\s*.*\n*/im, '').trim()
    return { subject, body }
  }
  const lines = text.trim().split('\n')
  if (lines.length > 1 && lines[0].length < 80 && !lines[0].toLowerCase().startsWith('hi') && !lines[0].toLowerCase().startsWith('dear')) {
    return { subject: lines[0].replace(/^[#*\s]+/, '').trim(), body: lines.slice(1).join('\n').trim() }
  }
  return { subject: 'Meeting Update', body: text.trim() }
}

function cleanBody(draft: string) {
  let body = draft.replace(/^['"“”]+|['"“”]+$/g, '').trim()
  body = body.split(/\n\s*(?:best|thanks|thank you|regards|cheers),?\s*\n?/i)[0].trim()
  body = body
    .replace(/\b(thx)\b/gi, 'thank you')
    .replace(/\bpls\b/gi, 'please')
    .replace(/\basap\b/gi, 'as soon as possible')
    .replace(/\bwont\b/gi, "won't")
    .replace(/\bcant\b/gi, "can't")
    .replace(/\bdont\b/gi, "don't")
    .replace(/\bim\b/gi, "I'm")
    .replace(/\bive\b/gi, "I've")
    .replace(/\bu\b/gi, 'you')
    .replace(/\bur\b/gi, 'your')
    .replace(/\bmsg\b/gi, 'message')
    .replace(/\bpto\b/gi, 'paid time off (PTO)')
    .replace(/\btmrw\b/gi, 'tomorrow')
    .replace(/\bmtg\b/gi, 'meeting')
  body = body
    .replace(/^(?:tell my manager|tell [^,]+)\s+/i, '')
    .replace(/\bwon't make the\b/gi, "won't be able to attend the")
    .replace(/\bcan't make the\b/gi, "can't attend the")
  body = body.replace(/(^|[.!?]\s+)([a-z])/g, (_, start, letter) => `${start}${letter.toUpperCase()}`)
  if (body && !/[.!?]$/.test(body)) body += '.'
  return body || 'I wanted to share a quick update and make sure we are aligned on the next steps.'
}

function mockPolish(draft: string, tone: string, senderName: string): Promise<{ polished_email: string }> {
  return new Promise((resolve, reject) => {
    const delay = 1000 + Math.random() * 600
    window.setTimeout(() => {
      if (Math.random() < 0.05) return reject(new Error('Simulated network error. Please retry.'))
      const recipient = inferRecipient(draft)
      const body = cleanBody(draft)
      const opening =
        tone === 'Friendly'
          ? 'Hope your day is going well!'
          : tone === 'Persuasive'
          ? 'I wanted to share this thoughtfully and highlight the value of moving forward.'
          : tone === 'Apologetic'
          ? 'I sincerely regret any inconvenience this may cause.'
          : 'I hope this message finds you well.'
      const closing =
        tone === 'Friendly'
          ? 'Thanks so much for understanding, and let me know if I can help with anything.'
          : tone === 'Persuasive'
          ? 'I would welcome the opportunity to discuss the next step and answer any questions.'
          : tone === 'Apologetic'
          ? 'Thank you for your patience, and please let me know how I can make this right.'
          : 'Please let me know if you require any further information.'
      const signoff = tone === 'Friendly' ? 'Cheers,' : tone === 'Apologetic' ? 'Sincerely,' : 'Best regards,'
      const subject = body.split(/[.!?]/)[0].replace(/^(I|We)\s+/i, '').slice(0, 65)
      resolve({
        polished_email: `Subject: ${subject || 'Quick update'}\n\n${
          tone === 'Professional' ? 'Dear' : 'Hi'
        } ${recipient}${tone === 'Professional' ? ',' : '!'}\n\n${opening}\n\n${body}\n\n${closing}\n\n${signoff}\n${
          senderName || 'Jordan'
        }`,
      })
    }, delay)
  })
}

function formatTime(timestamp: string) {
  try {
    const d = new Date(timestamp)
    const now = new Date()
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    if (diffHours < 48) return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}

function Logo({ large = false }: { large?: boolean }) {
  return (
    <div className={`flex items-center gap-2 font-bold tracking-tight ${large ? 'text-2xl' : 'text-lg'}`}>
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-400 text-white shadow-lg shadow-rose-200">
        <WandSparkles size={large ? 19 : 16} />
      </span>
      <span>
        inkwell<span className="text-rose-500">.</span>
      </span>
    </div>
  )
}

function Button({ children, variant = 'primary', className = '', ...props }: any) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-60 ${
        variant === 'primary'
          ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200'
          : variant === 'soft'
          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
          : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-white/10 dark:bg-[#1a1a20] dark:text-stone-300 dark:hover:bg-white/5'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default function Page() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [authed, setAuthed] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [route, setRoute] = useState('welcome')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [dark, setDark] = useState(false)

  const [draft, setDraft] = useState(
    'Hi Alex,\n\nI wanted to follow up on our conversation from last week. I have attached the updated proposal for your review.\n\nPlease let me know if you have any questions or would like to discuss it further.\n\nBest,\nJordan'
  )
  const [tone, setTone] = useState('Professional')
  const [result, setResult] = useState(initialStarterHistory[0].result)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [subject, setSubject] = useState('Proposal Follow-up')
  const [history, setHistory] = useState<HistoryItem[]>(initialStarterHistory)
  const [templates, setTemplates] = useState<[string, string][]>(fallbackTemplates)
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null)
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null)

  const [polishing, setPolishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [polishError, setPolishError] = useState('')

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }

  // Load user data from Supabase
  const loadUserData = async (activeUser: User) => {
    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', activeUser.id).maybeSingle()
      if (profileData) {
        setProfile(profileData)
      } else {
        // Fallback create initial profile if trigger was bypassed (e.g. OAuth providers)
        const defaultName = activeUser.user_metadata?.full_name || activeUser.user_metadata?.name || activeUser.email?.split('@')[0] || 'Member'
        const avatarUrl = activeUser.user_metadata?.avatar_url || activeUser.user_metadata?.picture || null
        const { data: createdProfile } = await supabase
          .from('profiles')
          .insert({ id: activeUser.id, email: activeUser.email!, full_name: defaultName, avatar_url: avatarUrl })
          .select()
          .maybeSingle()
        if (createdProfile) setProfile(createdProfile)
      }

      // 2. Fetch User Settings
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', activeUser.id)
        .maybeSingle()
      if (settingsData) {
        setUserSettings(settingsData)
        if (settingsData.default_tone) setTone(settingsData.default_tone)
        if (settingsData.theme === 'dark') setDark(true)
      }

      // 3. Fetch Email Generations History
      const { data: historyData } = await supabase
        .from('email_generations')
        .select('*')
        .eq('user_id', activeUser.id)
        .order('created_at', { ascending: false })
      if (historyData && historyData.length > 0) {
        setHistory(
          historyData.map((item) => ({
            id: item.id,
            tone: item.tone,
            draft: item.draft,
            result: item.result,
            date: formatTime(item.created_at),
            word_count: item.word_count,
            created_at: item.created_at,
          }))
        )
      }

      // 4. Fetch Templates
      const { data: templatesData } = await supabase.from('templates').select('*').order('created_at', { ascending: true })
      if (templatesData && templatesData.length > 0) {
        setTemplates(templatesData.map((t) => [t.title, t.content]))
      }
    } catch (err) {
      console.error('Error fetching Supabase data:', err)
    }
  }

  // Check Supabase session on mount & handle OAuth redirects
  useEffect(() => {
    const initAuth = async () => {
      // 1. Check for OAuth code exchange in URL query
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        const errorMsg = searchParams.get('error_description') || searchParams.get('error')

        if (errorMsg) {
          notify(`Google sign-in error: ${errorMsg}`)
          window.history.replaceState({}, document.title, window.location.pathname)
          return
        }

        if (code) {
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) {
              console.error('Code exchange failed:', error)
              notify(`Authentication failed: ${error.message}`)
            } else if (data.session?.user) {
              window.history.replaceState({}, document.title, window.location.pathname)
              localStorage.removeItem('inkwell-guest')
              setUser(data.session.user)
              setAuthed(true)
              setIsGuest(false)
              setRoute('home')
              loadUserData(data.session.user)
              notify('Signed in with Google successfully!')
              return
            }
          } catch (e: any) {
            console.error('OAuth code exchange exception:', e)
          }
        }

        // Check hash parameters for OAuth errors
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const hashError = hashParams.get('error_description') || hashParams.get('error')
          if (hashError) {
            notify(`Google sign-in error: ${hashError}`)
            window.history.replaceState({}, document.title, window.location.pathname)
            return
          }
        }
      }

      // 2. Check existing session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        setAuthed(true)
        setIsGuest(false)
        setRoute('home')
        loadUserData(session.user)
      } else {
        const guestSaved = localStorage.getItem('inkwell-guest')
        if (guestSaved === 'true') {
          setIsGuest(true)
          setAuthed(true)
          setRoute('home')
        }
      }
    }

    initAuth()

    // 3. Auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setAuthed(true)
        setIsGuest(false)
        loadUserData(session.user)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // Login handler
  const handleLogin = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) throw error
    if (data.user) {
      localStorage.removeItem('inkwell-guest')
      setUser(data.user)
      setAuthed(true)
      setIsGuest(false)
      setRoute('home')
      notify(`Welcome back, ${data.user.user_metadata?.full_name || data.user.email?.split('@')[0]}!`)
      loadUserData(data.user)
    }
  }

  // Signup handler
  const handleSignup = async (email: string, pass: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { full_name: fullName },
      },
    })
    if (error) throw error
    if (data.user) {
      localStorage.removeItem('inkwell-guest')
      setUser(data.user)
      setAuthed(true)
      setIsGuest(false)
      setRoute('home')
      notify('Account created successfully!')
      loadUserData(data.user)
    }
  }

  // Google OAuth handler
  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      })
      if (error) notify(`Google sign-in error: ${error.message}`)
    } catch (err: any) {
      notify(err.message || 'Failed to start Google sign-in')
    }
  }

  // Guest handler
  const handleGuest = () => {
    localStorage.setItem('inkwell-guest', 'true')
    setIsGuest(true)
    setAuthed(true)
    setRoute('home')
    notify('Entered Demo Mode as Guest')
  }

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('inkwell-guest')
    setUser(null)
    setProfile(null)
    setUserSettings(null)
    setAuthed(false)
    setIsGuest(false)
    setRoute('welcome')
    setShowMenu(false)
    notify('Logged out.')
  }

  // Polish action
  const polish = async () => {
    if (!draft.trim()) return notify('Add a draft before polishing.')
    setPolishing(true)
    setPolishError('')
    setFeedbackGiven(null)

    try {
      const senderName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Jordan'
      let polished = ''

      if (!USE_MOCK) {
        try {
          const res = await fetch('/api/polish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draft, tone, senderName }),
            signal: AbortSignal.timeout(20000),
          })

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            throw new Error(errData?.error || `AI error (${res.status})`)
          }

          const data = await res.json()
          polished = data.polished_email
        } catch (apiErr: any) {
          console.warn('Groq AI API issue, using local fallback:', apiErr)
          const fallbackRes = await mockPolish(draft, tone, senderName)
          polished = fallbackRes.polished_email
          notify('AI notice: Polished using local fallback.')
        }
      } else {
        const mockRes = await mockPolish(draft, tone, senderName)
        polished = mockRes.polished_email
      }

      const parsed = parseEmailSubjectAndBody(polished)
      setResult(polished)
      if (parsed.subject) {
        setSubject(parsed.subject)
      }
      const detectedEmail = inferRecipientEmail(draft)
      if (detectedEmail && !recipientEmail) {
        setRecipientEmail(detectedEmail)
      }

      let generationId: string | number = Date.now()

      // Save to Supabase if authenticated
      if (user && !isGuest) {
        const words = draft.trim().split(/\s+/).length
        const chars = draft.length
        const recipient = recipientEmail || inferRecipient(draft)
        const finalSubject = (subject || parsed.subject || 'Email draft').trim()

        const { data: savedGen, error: dbErr } = await supabase
          .from('email_generations')
          .insert({
            user_id: user.id,
            draft,
            tone,
            result: polished,
            subject: finalSubject,
            recipient,
            word_count: words,
            char_count: chars,
          })
          .select()
          .single()

        if (!dbErr && savedGen) {
          generationId = savedGen.id
          setCurrentGenerationId(savedGen.id)
        }
      }

      setHistory((items) => [
        {
          id: generationId,
          tone,
          draft,
          result: polished,
          date: 'Just now',
          word_count: draft.trim().split(/\s+/).length,
          created_at: new Date().toISOString(),
        },
        ...items,
      ])

      notify('Your email is polished and saved.')
    } catch (error) {
      setPolishError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setPolishing(false)
    }
  }

  // Copy action
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result)
    } catch {}
    setCopied(true)
    notify('Copied to clipboard')
    window.setTimeout(() => setCopied(false), 2000)
  }

  // Feedback action (Thumbs up / down)
  const submitFeedback = async (isHelpful: boolean) => {
    setFeedbackGiven(isHelpful ? 'up' : 'down')
    notify(isHelpful ? 'Thanks for the positive feedback!' : 'Feedback noted. We will keep refining!')

    if (user && currentGenerationId && typeof currentGenerationId === 'string') {
      try {
        await supabase.from('email_feedback').upsert(
          {
            generation_id: currentGenerationId,
            user_id: user.id,
            is_helpful: isHelpful,
          },
          { onConflict: 'generation_id,user_id' }
        )
      } catch (err) {
        console.error('Error saving feedback:', err)
      }
    }
  }

  // Delete history item
  const deleteHistoryItem = async (itemId: string | number) => {
    setHistory((items) => items.filter((i) => i.id !== itemId))
    notify('Email removed from history.')
    if (user && typeof itemId === 'string' && !itemId.startsWith('starter-')) {
      await supabase.from('email_generations').delete().eq('id', itemId).eq('user_id', user.id)
    }
  }

  // Save profile updates
  const saveProfile = async (fullName: string, jobTitle: string) => {
    if (!user || isGuest) {
      setProfile((prev) => ({
        ...(prev || {
          id: 'guest',
          email: 'guest@inkwell.ai',
          avatar_url: null,
          created_at: '',
          updated_at: '',
        }),
        full_name: fullName,
        job_title: jobTitle,
      }))
      return notify('Demo mode: Profile updated locally.')
    }

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, job_title: jobTitle, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      notify('Failed to save profile.')
    } else {
      setProfile((prev) => (prev ? { ...prev, full_name: fullName, job_title: jobTitle } : null))
      notify('Profile saved to database!')
    }
  }

  // Save settings updates
  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (updates.theme !== undefined) {
      setDark(updates.theme === 'dark')
    }
    if (updates.default_tone) {
      setTone(updates.default_tone)
    }

    if (user && !isGuest) {
      await supabase
        .from('user_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
    }
    notify('Settings preference saved.')
  }

  if (!authed) {
    return (
      <AuthScreen
        mode={route === 'signup' ? 'signup' : authMode}
        setMode={setAuthMode}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onGoogleAuth={handleGoogleAuth}
        onGuest={handleGuest}
      />
    )
  }

  const userDisplayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || (isGuest ? 'Guest User' : 'Jordan Davis')
  const userInitials = userDisplayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'JD'

  return (
    <div className="min-h-screen bg-[#fffbf5] pb-28 text-[#111827] dark:bg-[#0f0f12] dark:text-stone-100">
      <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-[#fffbf5]/85 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f0f12]/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            {isGuest ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                Guest Demo
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Supabase Connected
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <Sparkles size={11} />
              Groq AI Active
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              aria-label="Search"
              onClick={() => notify('Quick search shortcuts available in next update')}
              className="rounded-full p-2.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-white/10"
            >
              <Search size={18} />
            </button>
            <button
              aria-label="Notifications"
              onClick={() => notify('You have no unread notifications.')}
              className="relative rounded-full p-2.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-white/10"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500" />
            </button>
            <div className="relative">
              <button
                aria-label="Open profile menu"
                onClick={() => setShowMenu(!showMenu)}
                className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-amber-300 text-xs font-bold text-white shadow"
              >
                {userInitials}
              </button>
              {showMenu && (
                <div className="absolute right-0 top-12 w-48 rounded-2xl border border-stone-200 bg-white p-2 text-sm shadow-xl dark:border-white/10 dark:bg-[#1a1a20]">
                  <div className="px-3 py-2 border-b border-stone-100 dark:border-white/10 mb-1">
                    <p className="font-semibold truncate">{userDisplayName}</p>
                    <p className="text-xs text-stone-400 truncate">{user?.email || 'guest@inkwell.ai'}</p>
                  </div>
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-stone-100 dark:hover:bg-white/10"
                    onClick={() => {
                      setRoute('profile')
                      setShowMenu(false)
                    }}
                  >
                    <UserIcon size={16} /> Profile
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-stone-100 dark:hover:bg-white/10"
                    onClick={() => {
                      setRoute('settings')
                      setShowMenu(false)
                    }}
                  >
                    <Settings size={16} /> Settings
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-stone-100 dark:hover:bg-white/10"
                    onClick={() => {
                      const next = !dark
                      setDark(next)
                      updateSettings({ theme: next ? 'dark' : 'light' })
                    }}
                  >
                    {dark ? <Sun size={16} /> : <Moon size={16} />} Theme
                  </button>
                  <button
                    className="mt-1 flex w-full items-center gap-2 border-t border-stone-100 px-3 py-2 pt-2.5 text-left text-rose-600 dark:border-white/10"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {route === 'home' && (
          <HomeView
            draft={draft}
            setDraft={setDraft}
            tone={tone}
            setTone={setTone}
            result={result}
            subject={subject}
            setSubject={setSubject}
            recipientEmail={recipientEmail}
            setRecipientEmail={setRecipientEmail}
            polish={polish}
            polishing={polishing}
            copy={copy}
            copied={copied}
            templates={templates}
            notify={notify}
            polishError={polishError}
            feedbackGiven={feedbackGiven}
            onFeedback={submitFeedback}
            displayName={userDisplayName.split(' ')[0]}
          />
        )}
        {route === 'dashboard' && <Dashboard history={history} />}
        {route === 'history' && (
          <HistoryView
            history={history}
            setDraft={setDraft}
            setTone={setTone}
            setResult={setResult}
            setSubject={setSubject}
            setRoute={setRoute}
            onDelete={deleteHistoryItem}
          />
        )}
        {route === 'profile' && (
          <ProfileView
            profile={profile}
            user={user}
            isGuest={isGuest}
            initials={userInitials}
            onSave={saveProfile}
          />
        )}
        {route === 'settings' && (
          <SettingsView
            dark={dark}
            tone={tone}
            onUpdateSettings={updateSettings}
          />
        )}
      </main>

      <nav className="fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-center justify-around rounded-2xl border border-white/70 bg-white/85 p-2 shadow-2xl shadow-rose-100 backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1a20]/90">
        <NavItem active={route === 'home'} icon={<Home />} label="Home" onClick={() => setRoute('home')} />
        <NavItem
          active={route === 'dashboard'}
          icon={<Sparkles />}
          label="Dashboard"
          onClick={() => setRoute('dashboard')}
        />
        <button
          aria-label="New email"
          onClick={() => {
            setRoute('home')
            setDraft('')
            setResult('')
          }}
          className="grid size-12 -translate-y-4 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-xl shadow-rose-300 transition hover:scale-105"
        >
          <Plus />
        </button>
        <NavItem active={route === 'history'} icon={<History />} label="History" onClick={() => setRoute('history')} />
        <NavItem active={route === 'profile'} icon={<UserIcon />} label="You" onClick={() => setRoute('profile')} />
      </nav>

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[#111827] px-4 py-3 text-sm text-white shadow-xl animate-in fade-in slide-in-from-bottom-2"
        >
          <Check className="text-emerald-400" size={16} />
          {toast}
        </div>
      )}
    </div>
  )
}

function NavItem({ active, icon, label, onClick }: any) {
  return (
    <button
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={`flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1 text-[10px] transition ${
        active ? 'font-semibold text-rose-500' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function AuthScreen({ mode, setMode, onLogin, onSignup, onGoogleAuth, onGuest }: any) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.')
      return
    }
    if (mode === 'signup' && !fullName.trim()) {
      setErrorMsg('Please enter your full name.')
      return
    }
    setErrorMsg('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        await onSignup(email, password, fullName)
      } else {
        await onLogin(email, password)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fffbf5] text-[#111827] dark:bg-[#0f0f12] dark:text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-10 lg:grid-cols-2">
        <div className="hidden lg:block">
          <Logo large />
          <h1 className="mt-16 max-w-lg text-6xl font-bold leading-[1.05] tracking-tight">
            Say it well.
            <br />
            <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
              Every time.
            </span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-stone-500">
            Turn rough thoughts into clear, confident emails that sound like you. Backed by Supabase.
          </p>
          <div className="relative mt-12 h-56 rounded-[2rem] bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 p-8 dark:from-rose-950/40 dark:to-amber-950/30">
            <div className="absolute right-16 top-12 rotate-6 rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1a1a20]">
              <FileText className="mb-3 text-rose-500" />
              <div className="h-2 w-36 rounded bg-stone-200 dark:bg-white/10" />
              <div className="mt-2 h-2 w-24 rounded bg-stone-100 dark:bg-white/5" />
            </div>
            <Sparkles className="absolute bottom-10 left-20 text-amber-500" />
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Logo large />
          </div>
          <div className="rounded-[2rem] border border-stone-200 bg-white p-7 shadow-xl shadow-orange-100 dark:border-white/10 dark:bg-[#1a1a20] dark:shadow-none sm:p-9">
            <h2 className="text-3xl font-bold">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
            <p className="mt-2 text-stone-500">
              {mode === 'signup' ? 'Your best emails are a few clicks away.' : 'Pick up where you left off.'}
            </p>

            {errorMsg && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              {mode === 'signup' && (
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  required
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-white/10 dark:bg-white/5 dark:focus:ring-rose-950/50"
                />
              )}
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                type="email"
                required
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-white/10 dark:bg-white/5 dark:focus:ring-rose-950/50"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                required
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-white/10 dark:bg-white/5 dark:focus:ring-rose-950/50"
              />

              <Button type="submit" disabled={loading} className="mt-4 w-full">
                {loading ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <>
                    {mode === 'signup' ? 'Create account' : 'Log in'} <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-stone-400">
              <span className="h-px flex-1 bg-stone-200 dark:bg-white/10" />
              or
              <span className="h-px flex-1 bg-stone-200 dark:bg-white/10" />
            </div>

            <Button variant="outline" className="w-full" onClick={onGoogleAuth}>
              Continue with Google
            </Button>

            <p className="mt-6 text-center text-sm text-stone-500">
              {mode === 'signup' ? 'Already have an account?' : 'New to Inkwell?'}{' '}
              <button
                type="button"
                className="font-semibold text-rose-500 hover:underline"
                onClick={() => {
                  setErrorMsg('')
                  setMode(mode === 'signup' ? 'login' : 'signup')
                }}
              >
                {mode === 'signup' ? 'Log in' : 'Create account'}
              </button>
            </p>

            <button
              type="button"
              className="mt-4 block w-full text-center text-sm font-medium text-stone-500 underline-offset-4 hover:underline"
              onClick={onGuest}
            >
              Continue as guest
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HomeView({
  draft,
  setDraft,
  tone,
  setTone,
  result,
  subject,
  setSubject,
  recipientEmail,
  setRecipientEmail,
  polish,
  polishing,
  copy,
  copied,
  templates,
  notify,
  polishError,
  feedbackGiven,
  onFeedback,
  displayName,
}: any) {
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  // Parse subject and body from the generated result
  const { subject: extractedSubject, body: extractedBody } = useMemo(() => {
    return parseEmailSubjectAndBody(result)
  }, [result])

  const currentSubject = subject || extractedSubject
  const displayedBody = extractedBody || result

  const handleCopy = async () => {
    try {
      const finalSubject = currentSubject.trim()
      const finalBody = (displayedBody || result || '').trim()
      const textToCopy = finalSubject ? `Subject: ${finalSubject}\n\n${finalBody}` : finalBody
      await navigator.clipboard.writeText(textToCopy)
    } catch {}
    if (copy) copy()
  }

  const handleOpenInGmail = () => {
    if (!result || !result.trim()) {
      notify('Please polish an email first.')
      return
    }

    if (!recipientEmail || !recipientEmail.trim()) {
      notify('Please enter a recipient email address.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail.trim())) {
      notify('Please enter a valid email address.')
      return
    }

    const finalSubject = currentSubject.trim()
    if (!finalSubject) {
      notify('Email subject is missing.')
      return
    }

    const finalBody = (displayedBody || result || '').trim()
    if (!finalBody) {
      notify('Email body is missing.')
      return
    }

    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      recipientEmail.trim()
    )}&su=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(finalBody)}`

    notify('Opening Gmail...')
    window.open(gmailComposeUrl, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => {
      notify('Gmail opened — review and click Send.')
    }, 600)
  }

  return (
    <>
      <div className="mb-7">
        <p className="mb-2 text-sm font-semibold text-rose-500">{todayFormatted}</p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Good day, {displayName}</h1>
        <p className="mt-2 text-stone-500">Make every word count.</p>
      </div>

      <div className="mb-7 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[['All', ''], ...templates].map(([name, text]: any, i: number) => (
          <button
            key={name}
            onClick={() => text && setDraft(text)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              i === 0
                ? 'bg-[#111827] text-white dark:bg-white dark:text-[#111827]'
                : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-white/10 dark:bg-white/5 dark:text-stone-300'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {polishError && (
        <div
          role="alert"
          className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <span>{polishError}</span>
          <button
            onClick={polish}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a20] md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Your draft</h2>
              <p className="mt-1 text-sm text-stone-400">Write naturally. We&apos;ll handle the polish.</p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500 dark:bg-rose-950/40">
              Draft saved
            </span>
          </div>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 5000))}
            className="min-h-[280px] w-full resize-none rounded-2xl border border-stone-200 bg-[#fffbf5] p-4 text-[15px] leading-7 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-white/10 dark:bg-white/5 dark:focus:ring-rose-950/40"
            placeholder="Start writing your email..."
          />

          <div className="mt-3 flex justify-between text-xs text-stone-400">
            <span>
              {words} words · {draft.length} characters
            </span>
            <span className={draft.length > 4500 ? 'text-amber-600' : ''}>{5000 - draft.length} remaining</span>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-400">Choose a tone</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tones.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setTone(t.name)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    tone === t.name
                      ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-200 dark:bg-rose-950/30 dark:ring-rose-900/50'
                      : 'border-stone-200 hover:border-stone-300 dark:border-white/10 dark:hover:border-white/20'
                  }`}
                >
                  <span className={`mb-2 grid size-8 place-items-center rounded-lg bg-gradient-to-br ${t.color} text-white`}>
                    {t.icon}
                  </span>
                  <span className="text-xs font-semibold">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={polish} disabled={polishing} className="mt-6 w-full py-3.5">
            {polishing ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Polishing
                with AI...
              </>
            ) : (
              <>
                <WandSparkles size={17} /> Polish My Email
              </>
            )}
          </Button>
        </section>

        <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a20] md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Your polished email</h2>
              <p className="mt-1 text-sm text-stone-400">Clear, confident, and ready to send.</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-950/30">
              {tone}
            </span>
          </div>

          {/* Recipient Email & Subject Fields */}
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Recipient Email
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full rounded-xl border border-stone-200 bg-[#fffbf5] px-3.5 py-2.5 text-sm text-stone-900 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-rose-950/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Subject
              </label>
              <input
                type="text"
                value={currentSubject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Meeting Update"
                className="w-full rounded-xl border border-stone-200 bg-[#fffbf5] px-3.5 py-2.5 text-sm font-medium text-stone-900 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-rose-950/40"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Polished Message
            </label>
            <div className="min-h-[220px] whitespace-pre-wrap rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 p-5 text-[15px] leading-7 text-stone-700 dark:from-rose-950/20 dark:to-amber-950/20 dark:text-stone-200">
              {displayedBody || (
                <span className="text-stone-400 italic">Your refined email will appear here once polished.</span>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button variant="soft" onClick={handleCopy} disabled={!result}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button
              variant="primary"
              onClick={handleOpenInGmail}
              disabled={!result}
              className="bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200 transition hover:from-red-600 hover:to-amber-600"
            >
              <Mail size={16} /> Open in Gmail
            </Button>
            <Button variant="outline" onClick={polish} disabled={polishing || !draft.trim()}>
              <RefreshCw size={16} className={polishing ? 'animate-spin' : ''} /> Regenerate
            </Button>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                aria-label="Helpful"
                onClick={() => onFeedback(true)}
                className={`rounded-xl border p-2.5 transition ${
                  feedbackGiven === 'up'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'border-stone-200 text-stone-400 hover:text-emerald-500 dark:border-white/10'
                }`}
              >
                <ThumbsUp size={16} />
              </button>
              <button
                aria-label="Not helpful"
                onClick={() => onFeedback(false)}
                className={`rounded-xl border p-2.5 transition ${
                  feedbackGiven === 'down'
                    ? 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                    : 'border-stone-200 text-stone-400 hover:text-rose-500 dark:border-white/10'
                }`}
              >
                <ThumbsDown size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

function Dashboard({ history }: { history: HistoryItem[] }) {
  const totalEmails = history.length
  const totalWords = useMemo(() => {
    return history.reduce((sum, item) => sum + (item.word_count || item.draft.split(/\s+/).length || 0), 0)
  }, [history])

  const topTone = useMemo(() => {
    if (history.length === 0) return 'Professional'
    const counts: Record<string, number> = {}
    history.forEach((h) => {
      counts[h.tone] = (counts[h.tone] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Professional'
  }, [history])

  // Compute daily activity distribution
  const activityHeights = useMemo(() => {
    if (history.length <= 2) return [38, 55, 42, 76, 54, 88, 64]
    const days = [0, 0, 0, 0, 0, 0, 0]
    history.forEach((item) => {
      if (item.created_at) {
        const dayIdx = (new Date(item.created_at).getDay() + 6) % 7 // Monday = 0
        days[dayIdx] += 1
      }
    })
    const max = Math.max(...days, 1)
    return days.map((c) => Math.max(25, Math.round((c / max) * 100)))
  }, [history])

  return (
    <>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-stone-500">Live analytics powered by your Supabase database.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Emails polished', `${totalEmails}`],
          ['Words processed', totalWords.toLocaleString()],
          ['Top tone', topTone],
          ['Day streak', `${Math.min(totalEmails, 7)} days`],
        ].map(([label, value]) => (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-[#1a1a20]" key={label}>
            <p className="text-sm text-stone-500">{label}</p>
            <p className="mt-4 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-emerald-500">+12% this month</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a20]">
        <h2 className="font-bold">Weekly activity</h2>
        <div className="mt-7 flex h-48 items-end gap-3">
          {activityHeights.map((height, i) => (
            <div className="flex flex-1 flex-col items-center gap-3" key={i}>
              <div
                style={{ height: `${height}%` }}
                className="w-full rounded-t-xl bg-gradient-to-t from-rose-500 to-amber-400 transition-all duration-500"
              />
              <span className="text-xs text-stone-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function HistoryView({ history, setDraft, setTone, setResult, setSubject, setRoute, onDelete }: any) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">History</h1>
          <p className="mt-2 text-stone-500">Find and reuse every email you&apos;ve polished.</p>
        </div>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500 dark:bg-rose-950/40">
          {history.length} saved
        </span>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {history.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#1a1a20]">
            <p className="text-stone-500">No emails polished yet. Start writing on the Home screen!</p>
          </div>
        ) : (
          history.map((item: HistoryItem) => (
            <div
              key={item.id}
              className="group rounded-2xl border border-stone-200 bg-white p-5 transition hover:shadow-md dark:border-white/10 dark:bg-[#1a1a20]"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500 dark:bg-rose-950/40">
                  {item.tone}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{item.date}</span>
                  <button
                    aria-label="Delete history item"
                    onClick={() => onDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-500 transition p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold">{item.draft}</p>
              <p className="mt-2 text-sm leading-6 text-stone-500 line-clamp-2">{item.result}</p>
              <button
                className="mt-4 text-sm font-semibold text-rose-500 hover:underline"
                onClick={() => {
                  setDraft(item.draft)
                  setTone(item.tone)
                  setResult(item.result)
                  const parsed = parseEmailSubjectAndBody(item.result)
                  if (parsed.subject && setSubject) setSubject(parsed.subject)
                  setRoute('home')
                }}
              >
                Reuse email <ChevronRight className="inline" size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function ProfileView({ profile, user, isGuest, initials, onSave }: any) {
  const [fullName, setFullName] = useState(profile?.full_name || (isGuest ? 'Guest User' : 'Jordan Davis'))
  const [jobTitle, setJobTitle] = useState(profile?.job_title || 'Product Designer')

  useEffect(() => {
    if (profile) {
      if (profile.full_name) setFullName(profile.full_name)
      if (profile.job_title) setJobTitle(profile.job_title)
    }
  }, [profile])

  return (
    <>
      <h1 className="text-3xl font-bold">Your profile</h1>
      <p className="mt-2 text-stone-500">Manage your identity and signature attributes.</p>

      <div className="mt-8 rounded-[1.75rem] border border-stone-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a20]">
        <div className="flex items-center gap-4">
          <div className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-amber-300 text-xl font-bold text-white shadow-lg shadow-rose-200">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold">{fullName || 'Jordan Davis'}</h2>
            <p className="text-stone-500">{user?.email || 'guest@inkwell.ai'}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-stone-500">
            Full name
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-stone-200 bg-transparent px-4 py-3 text-stone-900 outline-none focus:border-rose-400 dark:border-white/10 dark:text-white"
            />
          </label>
          <label className="text-sm text-stone-500">
            Job title
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Product Designer"
              className="mt-2 w-full rounded-xl border border-stone-200 bg-transparent px-4 py-3 text-stone-900 outline-none focus:border-rose-400 dark:border-white/10 dark:text-white"
            />
          </label>
        </div>

        <Button className="mt-6" onClick={() => onSave(fullName, jobTitle)}>
          Save changes
        </Button>
      </div>
    </>
  )
}

function SettingsView({ dark, tone, onUpdateSettings }: any) {
  return (
    <>
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mt-2 text-stone-500">Make Inkwell work the way you work.</p>

      <div className="mt-8 max-w-2xl divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#1a1a20]">
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="font-semibold">Appearance</p>
            <p className="text-sm text-stone-500">Switch between light and dark mode.</p>
          </div>
          <button
            onClick={() => onUpdateSettings({ theme: dark ? 'light' : 'dark' })}
            className="rounded-xl border border-stone-200 p-3 hover:bg-stone-50 dark:border-white/10 dark:hover:bg-white/5"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="flex items-center justify-between p-5">
          <div>
            <p className="font-semibold">Default tone</p>
            <p className="text-sm text-stone-500">Used for new emails.</p>
          </div>
          <select
            value={tone}
            onChange={(e) => onUpdateSettings({ default_tone: e.target.value as any })}
            className="rounded-xl border border-stone-200 bg-transparent px-3 py-2 outline-none dark:border-white/10 dark:bg-[#1a1a20]"
          >
            {tones.map((t) => (
              <option key={t.name} value={t.name} className="dark:bg-[#1a1a20]">
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between p-5">
          <div>
            <p className="font-semibold">Auto-append signature</p>
            <p className="text-sm text-stone-500">Add your sign-off automatically.</p>
          </div>
          <input
            type="checkbox"
            defaultChecked
            onChange={(e) => onUpdateSettings({ auto_append_signature: e.target.checked })}
            className="size-5 accent-rose-500"
          />
        </div>
      </div>
    </>
  )
}
