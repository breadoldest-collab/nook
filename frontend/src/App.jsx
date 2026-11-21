import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  ArrowUp,
  ArrowUpRight,
  ArrowLeft,
  Bookmark,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Database,
  Download,
  Eye,
  EyeOff,
  Image,
  List,
  Mic,
  MoreHorizontal,
  Plus,
  Palette,
  Search,
  Settings2,
  Sparkles,
  Sun,
  UserRound,
  X,
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabaseClient'
import SplashCursor from './components/SplashCursor'
import './App.css'

const initialEntry = `Today felt softer than usual. I left my phone at home and took the long way back from the market. The air had that almost-rain smell, and for once I didn’t feel the need to hurry through it.

I’m noticing how much space appears when I stop trying to fill every quiet moment. Maybe that is enough for today.`

const seedEntries = [
  { id: 'today', title: 'A slower Tuesday', date: 'Today · 9:42 AM', body: initialEntry, tags: ['reflection', 'gratitude'], favorite: false },
  { id: 'morning', title: 'The morning walk', date: 'Yesterday', body: 'The streets were quiet before everyone else woke. I walked without headphones and noticed the trees turning toward the light.', tags: ['gratitude'], favorite: true },
  { id: 'small-things', title: 'Small things I noticed', date: 'May 18, 2024', body: 'A warm cup, a blue notebook, rain against the window. Small things deserve to be remembered.', tags: ['ideas'], favorite: false },
]

const defaultMessages = [
  { role: 'companion', text: 'It sounds like you found a little more breathing room today. What did the quiet make possible?' },
  { role: 'user', text: 'I noticed details I usually rush past. It made the walk feel like its own small experience.' },
  { role: 'companion', text: 'That sounds meaningful. I’ll remember that slowing down helped you notice what was already there.' },
]
const splashCursorColors = {
  light: ['#171717'],
  dark: ['#e8e8e8'],
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'models/gemini-flash-latest'

async function askGemini(companionName, conversationHistory, currentEntryBody, userMessage, customKey) {
  const activeKey = customKey || (typeof window !== "undefined" ? localStorage.getItem("solace-gemini-key") : null) || GEMINI_API_KEY
  if (!activeKey) return null
  const entryContext = currentEntryBody?.trim()
    ? `The user is currently writing a journal entry:\n"""\n${currentEntryBody.slice(0, 1200)}\n"""\n\n`
    : ''
  const recentHistory = conversationHistory.slice(-10).map((m) =>
    `${m.role === 'user' ? 'User' : companionName}: ${m.text}`
  ).join('\n')
  const systemPrompt = `You are ${companionName}, a warm, emotionally intelligent journaling companion embedded in a private journaling app called Nook. Your role is to gently support the user's self-reflection. Keep replies short (1-3 sentences), warm, non-judgmental, and grounded. Never give clinical advice. Use the user's journal context to personalize your responses. Never repeat back the same phrase twice in a row.\n\n${entryContext}Recent conversation:\n${recentHistory}`

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${activeKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 180, temperature: 0.85 },
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
}

function loadGuestUser() {
  try {
    const saved = JSON.parse(localStorage.getItem('solace-guest-user'))
    if (saved?.username) return saved
  } catch {}
  return null
}

function NookDropdown({ ariaLabel, className = '', menuTitle, onChange, options, value }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)
  const selectedOption = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const moveFocus = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const items = [...dropdownRef.current.querySelectorAll('[role="menuitemradio"]')]
    const currentIndex = items.indexOf(document.activeElement)
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : currentIndex < 0
          ? event.key === 'ArrowDown' ? 0 : items.length - 1
          : (currentIndex + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length
    items[nextIndex]?.focus()
  }

  const openWithKeyboard = (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    setOpen(true)
    requestAnimationFrame(() => {
      const items = dropdownRef.current?.querySelectorAll('[role="menuitemradio"]')
      items?.[event.key === 'ArrowDown' ? 0 : items.length - 1]?.focus()
    })
  }

  return (
    <div className={`solace-dropdown ${className}`} ref={dropdownRef}>
      <button
        className={`solace-dropdown-trigger ${open ? 'open' : ''}`}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={openWithKeyboard}
        ref={triggerRef}
      >
        <span>{selectedOption?.label || ''}</span>
        <ChevronDown size={14} />
      </button>
      {open && <div className="solace-dropdown-menu" role="menu" aria-label={menuTitle} onKeyDown={moveFocus}>
        <p>{menuTitle}</p>
        <div className="solace-dropdown-options">
          {options.map((option) => {
            const selected = option.value === value
            return <button
              key={option.value}
              className={`solace-dropdown-option ${selected ? 'selected' : ''}`}
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
                triggerRef.current?.focus()
              }}
            >
              <span>{option.label}</span>
              {selected && <Check size={14} />}
            </button>
          })}
        </div>
      </div>}
    </div>
  )
}

function getTagTone(tag) {
  const hash = [...tag].reduce((total, character) => total + character.charCodeAt(0), 0)
  return ['sage', 'rose', 'sky', 'amber'][hash % 4]
}

function getDraftTitle(body) {
  const firstLine = body.trim().split('\n')[0].replace(/[.!?].*$/, '').trim()
  return !firstLine ? '' : firstLine.length > 38 ? `${firstLine.slice(0, 38)}…` : firstLine
}

function loadSidebarWidth(key, fallback, minimum, maximum) {
  const saved = Number(localStorage.getItem(key))
  return Number.isFinite(saved) && saved >= minimum && saved <= maximum ? saved : fallback
}

function getLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getEntryDateKey(entry, today = new Date()) {
  if (entry.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(entry.dateKey)) return entry.dateKey
  const date = entry.date || ''
  if (/^today\b/i.test(date)) return getLocalDateKey(today)
  if (/^yesterday\b/i.test(date)) {
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
    return getLocalDateKey(yesterday)
  }
  const match = date.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4})|\s+at\b)/)
  if (!match) return ''
  const month = new Date(`${match[1]} 1, 2000`).getMonth()
  const year = match[3] ? Number(match[3]) : today.getFullYear()
  if (Number.isNaN(month)) return ''
  return getLocalDateKey(new Date(year, month, Number(match[2])))
}

async function upsertJournalRows(rows) {
  const maxBatchBytes = 4_000_000
  let batch = []
  let batchBytes = 2
  for (const row of rows) {
    const rowBytes = new TextEncoder().encode(JSON.stringify(row)).length
    if (rowBytes > maxBatchBytes) throw new Error(`Entry “${row.data.title || 'Untitled entry'}” is too large to sync. Remove or reduce its attachment and try again.`)
    if (batch.length && batchBytes + rowBytes > maxBatchBytes) {
      const { error } = await supabase.from('journal_entries').upsert(batch, { onConflict: 'user_id,id' })
      if (error) throw error
      batch = []
      batchBytes = 2
    }
    batch.push(row)
    batchBytes += rowBytes
  }
  if (batch.length) {
    const { error } = await supabase.from('journal_entries').upsert(batch, { onConflict: 'user_id,id' })
    if (error) throw error
  }
}

function getUserDeletedEntryIds(userId) {
  const saved = localStorage.getItem(`solace-deleted-entry-ids-${userId}`)
  if (!saved) return []
  const ids = JSON.parse(saved)
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
    throw new Error('The saved deleted-entry list is invalid. Keep a journal export before changing browser storage.')
  }
  return [...new Set(ids)]
}

async function upsertJournalEntries(userId, entriesToSave) {
  await upsertJournalRows(entriesToSave.map((entry) => ({
    user_id: userId,
    id: entry.id,
    data: entry,
    updated_at: entry.updatedAt || new Date().toISOString(),
    deleted_at: null,
  })))
}

async function upsertJournalTombstones(userId, ids) {
  const deletedAt = new Date().toISOString()
  await upsertJournalRows(ids.map((id) => ({
    user_id: userId,
    id,
    data: { id },
    updated_at: deletedAt,
    deleted_at: deletedAt,
  })))
}

function loadStartView() {
  const saved = localStorage.getItem('solace-start-view')
  return ['today', 'entries', 'favorites'].includes(saved) ? saved : 'today'
}

function loadEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem('solace-entries'))
    return Array.isArray(saved) && saved.length ? saved : seedEntries
  } catch {
    return seedEntries
  }
}


function NookBrandIcon() {
  return (
    <span className="solace-brand-icon">
      <img src={`${import.meta.env.BASE_URL}nook-logo.png`} alt="Nook logo" className="solace-brand-logo-img" />
    </span>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('solace-theme') || 'light')
  const [entries, setEntries] = useState(loadEntries)
  const [authUser, setAuthUser] = useState(null)
  const [guestUser, setGuestUser] = useState(loadGuestUser)
  const [guestUsername, setGuestUsername] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [miraTyping, setMiraTyping] = useState(false)
  const [cloudError, setCloudError] = useState('')
  const [cloudStatus, setCloudStatus] = useState(isSupabaseConfigured ? 'loading' : 'unconfigured')
  const [cloudReadyUserId, setCloudReadyUserId] = useState(null)
  const [cloudRetry, setCloudRetry] = useState(0)
  const [cloudSyncRetry, setCloudSyncRetry] = useState(0)
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem('solace-selected') || 'today')
  const [view, setView] = useState('landing')
  const [settingsTab, setSettingsTab] = useState('account')
  const [startView, setStartView] = useState(loadStartView)
  const [miraVisible, setMiraVisible] = useState(() => localStorage.getItem('solace-mira-visible') !== 'false')
  const [sidebarWidth, setSidebarWidth] = useState(() => loadSidebarWidth('solace-sidebar-width', 240, 190, 380))
  const [companionWidth, setCompanionWidth] = useState(() => loadSidebarWidth('solace-companion-width', 330, 260, 460))
  const [resizingSidebar, setResizingSidebar] = useState(false)
  const [calendarDate, setCalendarDate] = useState(null)
  const [archiveMode, setArchiveMode] = useState('list')
  const [archiveTag, setArchiveTag] = useState('')
  const [archivePickerOpen, setArchivePickerOpen] = useState('')
  const [archiveMonth, setArchiveMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [currentYear] = useState(() => new Date().getFullYear())
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [saved, setSaved] = useState(true)
  const [message, setMessage] = useState('')
  const [conversationExpanded, setConversationExpanded] = useState(false)
  const [showLatestExchange, setShowLatestExchange] = useState(false)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('solace-messages'))
      if (Array.isArray(saved) && saved.length) return saved
    } catch {}
    return defaultMessages
  })
  const [profileName, setProfileName] = useState(() => localStorage.getItem('solace-profile') || 'Alex Morgan')
  const [profileSubtitle, setProfileSubtitle] = useState(() => localStorage.getItem('solace-profile-subtitle') || 'Personal journal')
  const [profileAvatar, setProfileAvatar] = useState(() => localStorage.getItem('solace-profile-avatar') || null)
  const [companionName, setCompanionName] = useState(() => localStorage.getItem('solace-companion-name') || 'Mira')
  const [tagComposerOpen, setTagComposerOpen] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const imageInputRef = useRef(null)
  const avatarInputRef = useRef(null)
  const saveTimerRef = useRef(null)
  const sidebarResizeRef = useRef(null)
  const entriesRef = useRef(entries)
  const authUserRef = useRef(authUser)
  const syncedEntriesRef = useRef([])
  const cloudSyncQueueRef = useRef(Promise.resolve())
  const archivePeriodRef = useRef(null)
  const editorRef = useRef(null)
  const reflectionIdeasRef = useRef(null)
  const settingsPageRef = useRef(null)
  const accountSettingsRef = useRef(null)
  const appearanceSettingsRef = useRef(null)
  const journalSettingsRef = useRef(null)
  const miraSettingsRef = useRef(null)
  const dataSettingsRef = useRef(null)

  const selectedEntry = entries.find((item) => item.id === selectedId) || entries[0]
  const entry = selectedEntry?.body || ''
  const profileInitials = profileName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const isSignedIn = !!(authUser || guestUser)

  useEffect(() => {
    localStorage.setItem('solace-theme', theme)
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#0a0a0a' : '#ffffff'
    document.body.style.backgroundColor = theme === 'dark' ? '#0a0a0a' : '#ffffff'
  }, [theme])

  useEffect(() => {
    localStorage.setItem('solace-selected', selectedId)
  }, [selectedId])

  useEffect(() => {
    localStorage.setItem('solace-messages', JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    localStorage.setItem('solace-profile', profileName)
  }, [profileName])

  useEffect(() => {
    localStorage.setItem('solace-profile-subtitle', profileSubtitle)
  }, [profileSubtitle])

  useEffect(() => {
    if (profileAvatar) localStorage.setItem('solace-profile-avatar', profileAvatar)
    else localStorage.removeItem('solace-profile-avatar')
  }, [profileAvatar])

  useEffect(() => {
    localStorage.setItem('solace-companion-name', companionName)
  }, [companionName])

  useEffect(() => {
    localStorage.setItem('solace-mira-visible', String(miraVisible))
  }, [miraVisible])

  useEffect(() => {
    if (!supabase) {
      return
    }

    let active = true
    let requestId = 0
    const loadAccountJournal = async (user) => {
      const currentRequest = ++requestId
      authUserRef.current = user
      setAuthUser(user)
      if (user) setView((currentView) => currentView === 'landing' ? loadStartView() : currentView)
      setCloudReadyUserId(null)
      setCloudError('')
      setAuthMessage('')

      if (!user) {
        setCloudStatus('signed-out')
        return
      }

      setCloudStatus('loading')
      const localEntries = entriesRef.current
      const localDeletedIds = getUserDeletedEntryIds(user.id)
      const { data: remoteRows, error: loadError } = await supabase
        .from('journal_entries')
        .select('id, data, updated_at, deleted_at')
        .eq('user_id', user.id)

      if (!active || currentRequest !== requestId) return
      if (loadError) {
        setCloudError(`Could not load your cloud journal: ${loadError.message}`)
        setCloudStatus('error')
        return
      }

      const remoteDeletedIds = remoteRows.filter((row) => row.deleted_at).map((row) => row.id)
      const deletedIds = [...new Set([...localDeletedIds, ...remoteDeletedIds])]
      if (localDeletedIds.length) {
        try {
          await upsertJournalTombstones(user.id, localDeletedIds)
        } catch (error) {
          if (!active || currentRequest !== requestId) return
          setCloudError(`Deleted entries are still safe locally, but their cloud deletion could not sync: ${error.message}`)
          setCloudStatus('error')
          return
        }
      }

      const deletedIdSet = new Set(deletedIds)
      const remoteById = new Map(remoteRows.filter((row) => !row.deleted_at && !deletedIdSet.has(row.id)).map((row) => [
        row.id,
        { ...row.data, updatedAt: row.data.updatedAt || row.updated_at },
      ]))
      const localEntriesToImport = []
      const mergeTimestamp = new Date().toISOString()
      const mergedEntries = localEntries.filter((item) => !deletedIdSet.has(item.id)).map((localEntry) => {
        const remoteEntry = remoteById.get(localEntry.id)
        if (!remoteEntry) {
          const importedEntry = { ...localEntry, updatedAt: localEntry.updatedAt || mergeTimestamp }
          localEntriesToImport.push(importedEntry)
          return importedEntry
        }

        const localUpdatedAt = Date.parse(localEntry.updatedAt || '')
        const remoteUpdatedAt = Date.parse(remoteEntry.updatedAt || '')
        remoteById.delete(localEntry.id)
        if (Number.isFinite(localUpdatedAt) && localUpdatedAt > remoteUpdatedAt) {
          localEntriesToImport.push(localEntry)
          return localEntry
        }
        return remoteEntry
      })
      mergedEntries.push(...remoteById.values())
      if (localEntriesToImport.length) {
        let importError
        try {
          await upsertJournalEntries(user.id, localEntriesToImport)
        } catch (error) {
          importError = error
        }
        if (!active || currentRequest !== requestId) return
        if (importError) {
          setCloudError(`Your local journal is still safe in this browser, but could not be imported: ${importError.message}`)
          setCloudStatus('error')
          return
        }
      }

      try {
        localStorage.setItem('solace-entries', JSON.stringify(mergedEntries))
      } catch (error) {
        setCloudError(`Cloud entries loaded, but the browser could not update its local copy: ${error.message}`)
      }
      syncedEntriesRef.current = mergedEntries
      entriesRef.current = mergedEntries
      setEntries(mergedEntries)
      setCloudReadyUserId(user.id)
      setCloudStatus('synced')
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (!active) return
        void loadAccountJournal(session?.user || null).catch((error) => {
          if (!active) return
          setCloudError(`Could not load your cloud journal: ${error.message}`)
          setCloudStatus('error')
        })
      }, 0)
    })

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!active) return
      if (error) {
        setCloudError(`Could not restore your sign-in: ${error.message}`)
        setCloudStatus('error')
        return
      }
      void loadAccountJournal(session?.user || null).catch((loadError) => {
        if (!active) return
        setCloudError(`Could not load your cloud journal: ${loadError.message}`)
        setCloudStatus('error')
      })
    }).catch((error) => {
      if (!active) return
      setCloudError(`Could not restore your sign-in: ${error.message}`)
      setCloudStatus('error')
    })

    return () => {
      active = false
      requestId += 1
      subscription.unsubscribe()
    }
  }, [cloudRetry])

  useEffect(() => {
    if (!supabase || !authUser || cloudReadyUserId !== authUser.id) return undefined

    const userId = authUser.id
    const entriesToSave = entries
    const retryWhenOnline = () => setCloudSyncRetry((attempt) => attempt + 1)
    window.addEventListener('online', retryWhenOnline)
    const timer = window.setTimeout(() => {
      cloudSyncQueueRef.current = cloudSyncQueueRef.current.then(async () => {
        if (authUserRef.current?.id !== userId) return
        const priorEntries = syncedEntriesRef.current
        const priorById = new Map(priorEntries.map((item) => [item.id, item]))
        const changedEntries = entriesToSave.filter((item) => priorById.get(item.id) !== item)
        const nextIds = new Set(entriesToSave.map((item) => item.id))
        const removedIds = priorEntries.filter((item) => !nextIds.has(item.id)).map((item) => item.id)
        if (!changedEntries.length && !removedIds.length) return
        setCloudStatus('syncing')
        await upsertJournalEntries(userId, changedEntries)

        if (removedIds.length) {
            await upsertJournalTombstones(userId, removedIds)
          }

        syncedEntriesRef.current = entriesToSave
        if (authUserRef.current?.id === userId) {
          setCloudError('')
          setCloudStatus('synced')
        }
      }).catch((error) => {
        if (authUserRef.current?.id !== userId) return
        setCloudError(`Your changes are saved in this browser but could not sync: ${error.message}`)
        setCloudStatus('error')
      })
    }, 500)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('online', retryWhenOnline)
    }
  }, [entries, authUser, cloudReadyUserId, cloudSyncRetry])

  useEffect(() => {
    document.title = 'Nook — Personal Journal'
  }, [])

  useEffect(() => {
    const closeMenu = (event) => {
      if (!event.target.closest('.solace-entry-status')) setOptionsOpen(false)
    }
    if (optionsOpen) document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [optionsOpen])

  useEffect(() => {
    if (!archivePickerOpen) return
    const handlePointerDown = (event) => {
      if (!archivePeriodRef.current?.contains(event.target)) setArchivePickerOpen('')
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setArchivePickerOpen('')
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [archivePickerOpen])

  useEffect(() => {
    if (view !== 'settings') return
    const page = settingsPageRef.current
    const sections = [
      { id: 'account', element: accountSettingsRef.current },
      { id: 'appearance', element: appearanceSettingsRef.current },
      { id: 'journal', element: journalSettingsRef.current },
      { id: 'mira', element: miraSettingsRef.current },
      { id: 'data', element: dataSettingsRef.current },
    ]
    if (!page || sections.some((section) => !section.element)) return

    const updateActiveSection = () => {
      const activeLine = window.innerHeight * 0.3
      const atPageEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      const activeSection = atPageEnd
        ? sections[sections.length - 1]
        : [...sections].reverse().find(({ element }) => element.getBoundingClientRect().top <= activeLine)
      setSettingsTab(activeSection?.id || 'account')
    }

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    return () => window.removeEventListener('scroll', updateActiveSection)
  }, [view])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      flushSync(() => setTheme(nextTheme))
      document.documentElement.style.backgroundColor = nextTheme === 'dark' ? '#0a0a0a' : '#ffffff'
      document.body.style.backgroundColor = nextTheme === 'dark' ? '#0a0a0a' : '#ffffff'
      return
    }

    const oldThemeColor = theme === 'dark' ? '#0a0a0a' : '#ffffff'
    const overlay = document.createElement('div')
    overlay.className = 'solace-theme-fade'
    overlay.style.backgroundColor = oldThemeColor
    document.body.appendChild(overlay)

    flushSync(() => setTheme(nextTheme))
    document.documentElement.style.backgroundColor = nextTheme === 'dark' ? '#0a0a0a' : '#ffffff'
    document.body.style.backgroundColor = nextTheme === 'dark' ? '#0a0a0a' : '#ffffff'

    if (overlay.animate) {
      const animation = overlay.animate(
        [
          { opacity: 1 },
          { opacity: 1, offset: 0.22 },
          { opacity: 0.96, offset: 0.35 },
          { opacity: 0.72, offset: 0.62 },
          { opacity: 0.18, offset: 0.82 },
          { opacity: 0 },
        ],
        { duration: 1100, easing: 'linear', fill: 'forwards' },
      )
      animation.finished.then(() => overlay.remove()).catch(() => overlay.remove())
    } else {
      overlay.style.opacity = '0'
      overlay.style.transition = 'opacity 700ms cubic-bezier(.4, 0, .2, 1)'
      window.setTimeout(() => overlay.remove(), 700)
    }
  }

  const persistEntries = (nextEntries) => {
    const currentEntriesById = new Map(entries.map((item) => [item.id, item]))
    const updatedAt = new Date().toISOString()
    const entriesToPersist = nextEntries.map((item) => (
      currentEntriesById.get(item.id) === item
        ? item
        : { ...item, updatedAt }
    ))
    entriesRef.current = entriesToPersist
    setEntries(entriesToPersist)
    try {
      localStorage.setItem('solace-entries', JSON.stringify(entriesToPersist))
    } catch {
      window.alert('This browser could not save all entry data. Large attachments may need to be removed.')
    }
  }

  const updateEntry = (updates) => {
    setSaved(false)
    persistEntries(entries.map((item) => item.id === selectedEntry.id ? { ...item, ...updates } : item))
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => setSaved(true), 550)
  }

  const sendMagicLink = async (event) => {
    event.preventDefault()
    if (!supabase || !authEmail.trim()) return
    setAuthBusy(true)
    setAuthMessage('')
    setCloudError('')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: authEmail.trim(),
        options: { emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString() },
      })
      if (error) {
        setCloudError(`Could not send sign-in link: ${error.message}`)
        return
      }
      setAuthMessage(`Sign-in link sent to ${authEmail.trim()}. Check your inbox to connect this journal.`)
    } catch (error) {
      setCloudError(`Could not send sign-in link: ${error.message}`)
    } finally {
      setAuthBusy(false)
    }
  }

  const signOut = async () => {
    if (!supabase) return
    setAuthBusy(true)
    setCloudError('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) setCloudError(`Could not sign out: ${error.message}`)
    } catch (error) {
      setCloudError(`Could not sign out: ${error.message}`)
    } finally {
      setAuthBusy(false)
    }
  }

  const createEntry = () => {
    const id = `entry-${Date.now()}`
    const now = new Date()
    const next = {
      id,
      title: '',
      date: now.toLocaleString('en-US', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      dateKey: getLocalDateKey(now),
      body: '',
      tags: [],
      favorite: false,
    }
    persistEntries([next, ...entries])
    setSelectedId(id)
    setView('today')
    setCalendarDate(null)
    requestAnimationFrame(() => editorRef.current?.focus())
  }

  const createEntryRef = useRef(createEntry)
  useEffect(() => {
    createEntryRef.current = createEntry
  })

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        createEntryRef.current()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const openToday = () => {
    setView('today')
    setSelectedId(entries.find((item) => item.id === 'today')?.id || entries[0].id)
    setCalendarDate(null)
  }

  const openJournal = () => {
    setCalendarDate(null)
    setView(startView)
  }

  const selectEntry = (id) => {
    setSelectedId(id)
    setView('today')
    setCalendarDate(null)
    setOptionsOpen(false)
  }

  const filteredEntries = entries.filter((item) => {
    if (calendarDate && getEntryDateKey(item) !== calendarDate) return false
    if (!search.trim()) return true
    const needle = search.toLowerCase()
    return `${item.title} ${item.body} ${item.tags.join(' ')}`.toLowerCase().includes(needle)
  })
  const favoriteEntries = filteredEntries.filter((item) => item.favorite)
  const matchesArchiveQuery = (item) => {
    if (archiveTag && !item.tags.includes(archiveTag)) return false
    if (!search.trim()) return true
    return `${item.title} ${item.body} ${item.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())
  }
  const archiveEntries = entries.filter((item) => {
    const dateKey = getEntryDateKey(item)
    if (!dateKey) return false
    const [year, month] = dateKey.split('-').map(Number)
    if (year !== archiveMonth.getFullYear() || month !== archiveMonth.getMonth() + 1) return false
    if (calendarDate && dateKey !== calendarDate) return false
    return matchesArchiveQuery(item)
  }).sort((left, right) => {
    const leftDate = getEntryDateKey(left)
    const rightDate = getEntryDateKey(right)
    return rightDate.localeCompare(leftDate) || right.date.localeCompare(left.date)
  })

  const sendMessage = (textValue = message) => {
    const text = textValue.trim()
    if (!text || miraTyping) return
    const userMsg = { role: 'user', text }
    setMessages((current) => [...current, userMsg])
    setShowLatestExchange(true)
    setMessage('')
    setMiraTyping(true)
    const currentMessages = [...messages, userMsg]
    askGemini(companionName, currentMessages, entry, text, geminiApiKey).then((aiReply) => {
      let reply = aiReply
      if (!reply) {
        const lower = text.toLowerCase()
        if (lower.includes('reflect')) reply = 'What part of today felt easiest to carry, and what part would you rather set down?'
        else if (lower.includes('pattern')) reply = 'We can look for a pattern together. Which feeling or theme keeps returning across your recent entries?'
        else if (/sad|anxious|tired|overwhelmed|stress/.test(lower)) reply = 'That sounds heavy. Stay with what you need right now—one small, kind next step may be enough.'
        else reply = 'Thank you for sharing that. We can keep it here and return to it gently whenever you are ready.'
      }
      setMessages((current) => [...current, { role: 'companion', text: reply }])
      setMiraTyping(false)
    }).catch(() => {
      setMessages((current) => [...current, { role: 'companion', text: 'I\'m here with you. Take your time.' }])
      setMiraTyping(false)
    })
  }

  const signInAsGuest = () => {
    const username = guestUsername.trim()
    if (!username) return
    const user = { username, createdAt: new Date().toISOString() }
    localStorage.setItem('solace-guest-user', JSON.stringify(user))
    localStorage.setItem('solace-profile', username)
    setGuestUser(user)
    setProfileName(username)
    setView(startView)
  }

  const signOutGuest = () => {
    setGuestUser(null)
    setGuestUsername('')
    setView('landing')
  }

  const deleteGuestAccount = () => {
    if (!window.confirm('Delete your guest account? This will clear your local journal data permanently.')) return
    localStorage.clear()
    setGuestUser(null)
    setGuestUsername('')
    setEntries(seedEntries)
    setMessages(defaultMessages)
    setView('landing')
  }

  const exportJournal = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      profileName,
      theme,
      entries,
      messages,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `solace-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const uploadAvatar = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { window.alert('Image must be under 2 MB.'); return }
    const reader = new FileReader()
    reader.onload = (e) => setProfileAvatar(e.target.result)
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => setProfileAvatar(null)

  const resetMiraConversation = () => {
    if (!window.confirm('Reset Mira’s conversation? This only clears the saved chat history.')) return
    setMessages(defaultMessages)
    setConversationExpanded(false)
    setShowLatestExchange(false)
  }

  const finishEntry = () => {
    if (selectedEntry.finished) return
    updateEntry({ finished: true })
    if (entry.trim()) {
      setMessages((current) => [...current, {
        role: 'companion',
        text: 'Your entry can rest here. What is one small thing from it you would like to carry with you?',
      }])
      setConversationExpanded(false)
      setShowLatestExchange(false)
    }
  }

  const addTag = () => {
    setTagDraft('')
    setTagComposerOpen(true)
  }

  const toggleFavorite = () => {
    updateEntry({ favorite: !selectedEntry.favorite })
    setOptionsOpen(false)
  }

  const deleteEntry = () => {
    if (entries.length === 1) return
    if (!window.confirm(`Delete “${selectedEntry.title}”?`)) return
    if (authUser) {
      try {
        const deletedIds = getUserDeletedEntryIds(authUser.id)
        if (!deletedIds.includes(selectedEntry.id)) {
          localStorage.setItem(
            `solace-deleted-entry-ids-${authUser.id}`,
            JSON.stringify([...deletedIds, selectedEntry.id]),
          )
        }
      } catch (error) {
        window.alert(`Could not safely save this deletion for cloud sync: ${error.message}`)
        return
      }
    }
    const next = entries.filter((item) => item.id !== selectedEntry.id)
    persistEntries(next)
    setSelectedId(next[0].id)
    setOptionsOpen(false)
  }

  const attachImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2500000) {
      window.alert('Please choose an image smaller than 2.5 MB.')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => updateEntry({ attachment: reader.result, attachmentName: file.name })
    reader.readAsDataURL(file)
  }

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop()
      setRecording(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      window.alert('Audio recording is not supported by this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data)
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const url = URL.createObjectURL(new Blob(chunksRef.current, { type: 'audio/webm' }))
        updateEntry({ audioUrl: url, audioName: 'Voice note' })
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      window.alert('Microphone access was not granted.')
    }
  }

  const wordCount = entry.trim() ? entry.trim().split(/\s+/).length : 0
  const titleValue = selectedEntry?.title === 'Untitled reflection' && !entry.trim()
    ? ''
    : selectedEntry?.title || ''
  const latestCompanion = messages.slice().reverse().find((item) => item.role === 'companion')
  const latestCompanionIndex = latestCompanion ? messages.lastIndexOf(latestCompanion) : -1
  const latestUser = messages.slice(0, latestCompanionIndex).reverse().find((item) => item.role === 'user')
  const visibleMessages = conversationExpanded
    ? messages
    : showLatestExchange && latestUser && latestCompanion
      ? [latestUser, latestCompanion]
      : latestCompanion ? [latestCompanion] : []

  const startSidebarResize = (side, event) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    sidebarResizeRef.current = {
      side,
      startX: event.clientX,
      startWidth: side === 'sidebar' ? sidebarWidth : companionWidth,
      width: side === 'sidebar' ? sidebarWidth : companionWidth,
    }
    setResizingSidebar(true)
  }

  const moveSidebarResize = (event) => {
    const resize = sidebarResizeRef.current
    if (!resize) return
    const delta = event.clientX - resize.startX
    const nextWidth = resize.side === 'sidebar'
      ? resize.startWidth + delta
      : resize.startWidth - delta
    const otherWidth = resize.side === 'sidebar' ? companionWidth : sidebarWidth
    const maximum = Math.min(
      resize.side === 'sidebar' ? 380 : 460,
      window.innerWidth - otherWidth - 416,
    )
    const width = Math.round(Math.max(resize.side === 'sidebar' ? 190 : 260, Math.min(maximum, nextWidth)))
    resize.width = width
    if (resize.side === 'sidebar') setSidebarWidth(width)
    else setCompanionWidth(width)
  }

  const finishSidebarResize = (event) => {
    const resize = sidebarResizeRef.current
    if (resize) {
      localStorage.setItem(resize.side === 'sidebar' ? 'solace-sidebar-width' : 'solace-companion-width', String(resize.width))
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    sidebarResizeRef.current = null
    setResizingSidebar(false)
  }

  const handleResizeKeyDown = (side, event) => {
    const grows = side === 'sidebar' ? event.key === 'ArrowRight' : event.key === 'ArrowLeft'
    const shrinks = side === 'sidebar' ? event.key === 'ArrowLeft' : event.key === 'ArrowRight'
    if (!grows && !shrinks) return
    event.preventDefault()
    const otherWidth = side === 'sidebar' ? companionWidth : sidebarWidth
    const maximum = Math.min(side === 'sidebar' ? 380 : 460, window.innerWidth - otherWidth - 416)
    const adjust = (width) => Math.round(Math.max(side === 'sidebar' ? 190 : 260, Math.min(maximum, width + (grows ? 20 : -20))))
    const nextWidth = adjust(side === 'sidebar' ? sidebarWidth : companionWidth)
    localStorage.setItem(side === 'sidebar' ? 'solace-sidebar-width' : 'solace-companion-width', String(nextWidth))
    if (side === 'sidebar') setSidebarWidth(nextWidth)
    else setCompanionWidth(nextWidth)
  }

  const calendarDays = (() => {
    const firstDay = new Date(archiveMonth.getFullYear(), archiveMonth.getMonth(), 1)
    const start = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - firstDay.getDay())
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
      const key = getLocalDateKey(date)
      return {
        date,
        key,
        inMonth: date.getMonth() === archiveMonth.getMonth(),
        entries: entries.filter((item) => getEntryDateKey(item) === key),
      }
    })
  })()
  const knownYears = [
    currentYear,
    archiveMonth.getFullYear(),
    ...entries.map((item) => Number(getEntryDateKey(item).slice(0, 4))).filter(Boolean),
  ]
  const firstArchiveYear = Math.min(...knownYears)
  const lastArchiveYear = Math.max(...knownYears)
  const archiveYears = Array.from(
    { length: lastArchiveYear - firstArchiveYear + 1 },
    (_, index) => lastArchiveYear - index,
  )
  const monthEntries = entries.filter((item) => {
    const key = getEntryDateKey(item)
    const inMonth = key.startsWith(`${archiveMonth.getFullYear()}-${String(archiveMonth.getMonth() + 1).padStart(2, '0')}-`)
    return inMonth && matchesArchiveQuery(item)
  })
  const archiveTags = [...new Set([...entries.flatMap((item) => item.tags), archiveTag].filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
  const archiveGroups = archiveEntries.reduce((groups, item) => {
    const key = getEntryDateKey(item)
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
    return groups
  }, {})
  const selectedDateCount = calendarDate
    ? monthEntries.filter((item) => getEntryDateKey(item) === calendarDate).length
    : 0
  const selectedDateLabel = calendarDate
    ? new Date(`${calendarDate}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''
  const sidebarDateCount = view === 'entries' ? selectedDateCount : filteredEntries.length
  const sidebarHeading = calendarDate
    ? `${selectedDateLabel} · ${sidebarDateCount} ${sidebarDateCount === 1 ? 'entry' : 'entries'}`
    : view === 'entries' ? 'All entries' : 'Recent entries'

  return (
    <div
      className={`solace-app ${view === 'settings' ? 'solace-settings-open' : ''} ${view === 'landing' ? 'solace-login-open' : ''} ${resizingSidebar ? 'solace-resizing' : ''}`}
      data-theme={theme}
      style={{ '--sidebar-width': `${sidebarWidth}px`, '--companion-width': `${companionWidth}px` }}
    >
      {view !== 'settings' && view !== 'landing' && <>
      <aside className="solace-sidebar" id="journal-sidebar">
        <div className="solace-sidebar-top">
          <div className="solace-brand-row">
            <a className="solace-brand" href="#welcome" onClick={(event) => {
              event.preventDefault()
              setView('landing')
            }}><NookBrandIcon />Nook</a>
            <div className="solace-brand-actions">
              <button className="solace-theme-toggle" type="button" aria-label="Toggle dark mode" onClick={toggleTheme}>
                <span className="solace-theme-thumb"><Sun size={10} /></span>
              </button>
            </div>
          </div>

          <button className="solace-new-entry" onClick={createEntry} title="New entry (Ctrl/Cmd+N)">
            <span className="solace-new-entry-icon"><Plus size={17} /></span>
            <span className="solace-new-entry-copy"><strong>New entry</strong></span>
          </button>

          <nav className="solace-nav" aria-label="Primary navigation">
            <button className={view === 'today' ? 'active' : ''} onClick={openToday}><Sun size={15} />Today</button>
            <button className={view === 'entries' ? 'active' : ''} onClick={() => { setCalendarDate(null); setView('entries') }}><BookOpen size={15} />All entries</button>
            <button className={view === 'favorites' ? 'active' : ''} onClick={() => { setCalendarDate(null); setView('favorites') }}><Bookmark size={15} />Favorites</button>
          </nav>

          <section className="solace-recent">
            <div className={`solace-section-heading ${calendarDate ? 'solace-section-heading-filtered' : ''}`}>
              <h2>{sidebarHeading}</h2>
              <div className="solace-section-actions">
                {calendarDate && <button aria-label="Clear date filter" title="Clear date filter" onClick={() => setCalendarDate(null)}><X size={14} /></button>}
                <button aria-label="Search entries" onClick={() => setSearchOpen((open) => !open)}><Search size={15} /></button>
              </div>
            </div>
            {searchOpen && <input className="solace-search" aria-label="Search entries" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your journal..." autoFocus />}
            <div className="solace-entry-list">
              {filteredEntries.map((item) => (
                <button key={item.id} className={`solace-entry-card ${item.id === selectedId ? 'active' : ''}`} onClick={() => selectEntry(item.id)}>
                  <p>{item.title}</p><span>{item.date}</span>
                </button>
              ))}
              {filteredEntries.length === 0 && <p className="solace-empty">No entries found.</p>}
            </div>
          </section>
        </div>

        <div className="solace-sidebar-bottom">
          <div className="solace-section-heading"><h2>Tags</h2><button aria-label="Add tag" onClick={addTag}><Plus size={15} /></button></div>
          <div className="solace-tags">
            {[...new Set(entries.flatMap((item) => item.tags))].map((tag) => (
              <button key={tag} className={`tag-tone-${getTagTone(tag)}`} onClick={() => { setSearch(tag); setSearchOpen(true) }}>{tag}</button>
            ))}
          </div>
          <div className="solace-profile">
            {profileAvatar
              ? <img className="solace-avatar solace-avatar-img" src={profileAvatar} alt={profileName} />
              : <span className="solace-avatar">{profileInitials}</span>}
            <div><p>{profileName}</p><span>{profileSubtitle}</span></div>
            <button aria-label="Open settings" onClick={() => setView('settings')}><MoreHorizontal size={16} /></button>
          </div>
        </div>
      </aside>
      <div
        className="solace-resizer"
        role="separator"
        aria-label="Resize journal sidebar"
        aria-controls="journal-sidebar"
        aria-orientation="vertical"
        aria-valuemin={190}
        aria-valuemax={Math.min(380, window.innerWidth - companionWidth - 416)}
        aria-valuenow={sidebarWidth}
        tabIndex={0}
        onPointerDown={(event) => startSidebarResize('sidebar', event)}
        onPointerMove={moveSidebarResize}
        onPointerUp={finishSidebarResize}
        onPointerCancel={finishSidebarResize}
        onKeyDown={(event) => handleResizeKeyDown('sidebar', event)}
      />
      </>}

      {view === 'landing' ? (
        <main className="solace-login-page">
          <SplashCursor
            rainbow={false}
            colors={splashCursorColors[theme]}
            colorSpeed={0.6}
            intensity={4}
            size={1.2}
            force={1}
            swirl={4}
            trail={2}
            momentum={1.2}
            shading={0.5}
            glow={0.25}
            quality="medium"
            clickSplash={false}
            intro={false}
            theme={theme}
            zIndex={0}
          />
          <header className="solace-login-topbar">
            <a className="solace-brand" href="#welcome" aria-label="Nook home">
              <NookBrandIcon />Nook
            </a>
            <div className="solace-login-topbar-actions">
              <button className="solace-theme-toggle" type="button" aria-label="Toggle dark mode" onClick={toggleTheme}>
                <span className="solace-theme-thumb"><Sun size={10} /></span>
              </button>
            </div>
          </header>

          <div className="solace-login-content">
            <section className="solace-login-intro" aria-labelledby="solace-login-title">
              <p className="solace-login-eyebrow"><span /> A QUIETER KIND OF JOURNAL</p>
              <h1 id="solace-login-title">A little space to come back to yourself.</h1>
              <p className="solace-login-description">A quiet place for the ordinary moments and the ones you’re still figuring out.</p>
              <div className="solace-login-preview" aria-label="A preview of a journal entry">
                <div className="solace-login-preview-top"><span>AN ENTRY, JUST FOR YOU</span><Bookmark size={15} /></div>
                <p>“Maybe I don’t need to have it all figured out to begin.”</p>
                <span className="solace-login-preview-date">A quiet thought, saved for later.</span>
              </div>
              <div className="solace-login-benefits">
                <span><Check size={14} /> Write at your own pace</span>
                <span><Check size={14} /> Find entries by date, tag, or favorite</span>
              </div>
              <p className="solace-login-privacy"><span /> Private by default <i /> No ads <i /> Saved in this browser</p>
            </section>

            <section className="solace-login-card" aria-labelledby="solace-login-card-title">
              <p className="solace-login-card-kicker">YOUR JOURNAL IS WAITING</p>
              <h2 id="solace-login-card-title">{isSignedIn ? 'Welcome back' : 'Welcome to Nook'}</h2>
              <p className="solace-login-card-copy">{isSignedIn
                ? `Signed in as ${guestUser?.username || authUser?.email || profileName}. Your journal is ready.`
                : 'Enter your name to start your personal, private journal.'}</p>

              {isSignedIn ? (
                <div className="solace-login-unconfigured" role="status">
                  <strong>You’re signed in.</strong>
                  <span>Open your journal whenever you’re ready.</span>
                </div>
              ) : (
                <form className="solace-login-form" onSubmit={(e) => { e.preventDefault(); signInAsGuest() }}>
                  <label htmlFor="solace-guest-username">Your name</label>
                  <input
                    id="solace-guest-username"
                    type="text"
                    autoComplete="nickname"
                    required
                    value={guestUsername}
                    onChange={(event) => setGuestUsername(event.target.value)}
                    placeholder="Enter your name"
                    maxLength={32}
                  />
                  <button type="submit" disabled={!guestUsername.trim()}>
                    Start journaling <ArrowUpRight size={16} />
                  </button>
                  <p className="solace-login-form-note">No password, no email. Your journal stays private in this browser.</p>
                </form>
              )}

              {authMessage && <p className="solace-login-message" role="status">{authMessage}</p>}
              {cloudError && <p className="solace-login-error" role="alert">{cloudError}</p>}

              <div className="solace-login-divider"><span>OR</span></div>
              <button className="solace-login-continue" type="button" onClick={openJournal}>
                {isSignedIn ? 'Open my journal' : 'Continue as guest'}
              </button>
              {isSignedIn && (
                <button className="solace-login-secondary-action" type="button" onClick={signOutGuest}>
                  Sign out
                </button>
              )}
              <p className="solace-login-local-note">
                {isSignedIn ? 'Your journal is saved in this browser.' : 'No email required · Your entries stay in this browser.'}
              </p>
            </section>
          </div>
          <footer className="solace-login-footer">A small place for the things that make a life.</footer>
        </main>
      ) : view === 'settings' ? (
        <main className="solace-settings-page" ref={settingsPageRef}>
          <div className="solace-settings-topbar">
            <a className="solace-brand" href="#today" onClick={(event) => {
              event.preventDefault()
              setView('today')
            }}><NookBrandIcon />Nook</a>
            <button className="solace-settings-back" onClick={() => setView('today')}><ArrowLeft size={15} />Back to journal</button>
          </div>
          <div className="solace-settings-inner">
            <header className="solace-settings-header">
              <p className="solace-date"><Settings2 size={16} /> YOUR SPACE</p>
              <h1>Settings</h1>
              <p>Manage your profile and personalize your journal.</p>
            </header>

            <nav className="solace-settings-tabs" aria-label="Settings categories">
              <button aria-current={settingsTab === 'account' ? 'location' : undefined} className={settingsTab === 'account' ? 'active' : ''} onClick={() => accountSettingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><UserRound size={15} />Account</button>
              <button aria-current={settingsTab === 'appearance' ? 'location' : undefined} className={settingsTab === 'appearance' ? 'active' : ''} onClick={() => appearanceSettingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Palette size={15} />Appearance</button>
              <button aria-current={settingsTab === 'journal' ? 'location' : undefined} className={settingsTab === 'journal' ? 'active' : ''} onClick={() => journalSettingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><BookOpen size={15} />Journal</button>
              <button aria-current={settingsTab === 'mira' ? 'location' : undefined} className={settingsTab === 'mira' ? 'active' : ''} onClick={() => miraSettingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Sparkles size={15} />{companionName}</button>
              <button aria-current={settingsTab === 'data' ? 'location' : undefined} className={settingsTab === 'data' ? 'active' : ''} onClick={() => dataSettingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Database size={15} />Data</button>
            </nav>

            <section id="settings-account" ref={accountSettingsRef} className="solace-settings-card" aria-labelledby="settings-account-heading">
              <header className="solace-settings-card-header">
                <h2 id="settings-account-heading">Account</h2>
                <p>Manage how you appear in your personal journal.</p>
              </header>
              <div className="solace-cloud-account">
                <div className="solace-cloud-account-copy">
                  <div>
                    <h3>Cloud sync</h3>
                    <p>{!isSupabaseConfigured
                      ? 'Connect a Supabase project to access your journal across devices.'
                      : authUser
                        ? `Signed in as ${authUser.email || 'your account'}`
                        : 'Sign in with a secure email link to sync your journal.'}</p>
                  </div>
                  {authUser ? (
                    <button className="solace-settings-action" type="button" disabled={authBusy || cloudStatus === 'loading'} onClick={signOut}>
                      {authBusy ? 'Signing out…' : 'Sign out'}
                    </button>
                  ) : isSupabaseConfigured && cloudStatus !== 'loading' && (
                    <form className="solace-cloud-signin" onSubmit={sendMagicLink}>
                      <input
                        type="email"
                        aria-label="Email for cloud sync"
                        autoComplete="email"
                        required
                        value={authEmail}
                        onChange={(event) => setAuthEmail(event.target.value)}
                        placeholder="you@example.com"
                      />
                      <button className="solace-settings-action" type="submit" disabled={authBusy}>
                        {authBusy ? 'Sending…' : 'Email me a sign-in link'}
                      </button>
                    </form>
                  )}
                </div>
                <p className="solace-cloud-status" aria-live="polite">
                  {!isSupabaseConfigured
                    ? 'Supabase is not configured yet. Follow the local setup steps in README.md.'
                    : cloudStatus === 'loading'
                      ? 'Checking your account…'
                      : cloudStatus === 'syncing'
                        ? 'Syncing your latest changes…'
                        : authUser && cloudStatus === 'synced'
                          ? 'Cloud sync is on. Your local journal copy is kept as a backup.'
                          : authUser && cloudStatus === 'error'
                            ? 'Cloud sync needs attention. Your browser copy remains available.'
                            : 'Your journal stays in this browser until you sign in.'}
                </p>
                {authMessage && <p className="solace-cloud-message" role="status">{authMessage}</p>}
                {cloudError && <div className="solace-cloud-error" role="alert">
                  <p>{cloudError}</p>
                  {authUser && <button className="solace-cloud-retry" type="button" onClick={() => setCloudRetry((attempt) => attempt + 1)}>Try again</button>}
                </div>}
              </div>
              <div className="solace-settings-row">
                <div className="solace-settings-row-copy">
                  <h3>Profile picture</h3>
                  <p>Add a photo to personalize your journal.</p>
                </div>
                <div className="solace-settings-avatar-actions">
                  {profileAvatar ? (
                    <img className="solace-avatar solace-avatar-img" src={profileAvatar} alt={profileName} />
                  ) : (
                    <span className="solace-avatar">{profileInitials}</span>
                  )}
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={uploadAvatar} hidden />
                  <button className="solace-settings-action" type="button" onClick={() => avatarInputRef.current?.click()}>
                    {profileAvatar ? 'Change photo' : 'Upload photo'}
                  </button>
                  {profileAvatar && (
                    <button className="solace-settings-action solace-settings-action-danger" type="button" onClick={removeAvatar}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="solace-settings-row">
                <div className="solace-settings-row-copy">
                  <h3>Profile name</h3>
                  <p>This name appears on your journal profile.</p>
                </div>
                <label className="solace-settings-field">
                  <span className="solace-visually-hidden">Your name</span>
                  <input aria-label="Your name" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Your name" />
                </label>
              </div>
              <div className="solace-settings-row">
                <div className="solace-settings-row-copy">
                  <h3>Profile subtitle</h3>
                  <p>Add a short label or personal note to your profile.</p>
                </div>
                <label className="solace-settings-field">
                  <span className="solace-visually-hidden">Profile subtitle</span>
                  <input aria-label="Profile subtitle" maxLength={48} value={profileSubtitle} onChange={(event) => setProfileSubtitle(event.target.value)} placeholder="A little about your journal" />
                </label>
              </div>
            </section>

            <section id="settings-appearance" ref={appearanceSettingsRef} className="solace-settings-card" aria-labelledby="settings-appearance-heading">
              <header className="solace-settings-card-header">
                <h2 id="settings-appearance-heading">Appearance</h2>
                <p>Choose a look that feels comfortable for your daily reflections.</p>
              </header>
              <button className="solace-settings-row solace-settings-theme" onClick={toggleTheme}>
                <span className="solace-settings-row-copy">
                  <h3>Theme</h3>
                  <p>Set the color theme for the whole site.</p>
                </span>
                <span className="solace-theme-choice">
                  <span className={`solace-theme-preview ${theme}`} aria-hidden="true" />
                  {theme === 'dark' ? 'Dark' : 'Light'}
                  <span className="solace-theme-toggle" aria-hidden="true">
                    <span className="solace-theme-thumb"><Sun size={10} /></span>
                  </span>
                </span>
              </button>
            </section>

            <section id="settings-journal" ref={journalSettingsRef} className="solace-settings-card" aria-labelledby="settings-journal-heading">
              <header className="solace-settings-card-header">
                <h2 id="settings-journal-heading">Journal</h2>
                <p>Set how you want Nook to open when you return.</p>
              </header>
              <div className="solace-settings-row">
                <div className="solace-settings-row-copy">
                  <h3>Starting page</h3>
                  <p>Choose the journal view shown when you open Nook.</p>
                </div>
                <div className="solace-settings-select">
                  <NookDropdown
                    ariaLabel="Starting page"
                    menuTitle="STARTING PAGE"
                    value={startView}
                    options={[
                      { value: 'today', label: 'Today' },
                      { value: 'entries', label: 'All entries' },
                      { value: 'favorites', label: 'Favorites' },
                    ]}
                    onChange={(nextView) => {
                      setStartView(nextView)
                      localStorage.setItem('solace-start-view', nextView)
                    }}
                  />
                </div>
              </div>
            </section>

            <section id="settings-mira" ref={miraSettingsRef} className="solace-settings-card" aria-labelledby="settings-mira-heading">
              <header className="solace-settings-card-header">
                <h2 id="settings-mira-heading">{companionName}</h2>
                <p>Personalize your reflection companion and manage conversation history.</p>
              </header>
              <div className="solace-settings-row">
                <div className="solace-settings-row-copy">
                  <h3>Companion name</h3>
                  <p>Customize the name of your reflection companion.</p>
                </div>
                <label className="solace-settings-field">
                  <span className="solace-visually-hidden">Companion name</span>
                  <input
                    aria-label="Companion name"
                    value={companionName}
                    onChange={(event) => setCompanionName(event.target.value.trim() || 'Mira')}
                    placeholder="e.g. Mira"
                    maxLength={24}
                  />
                </label>
              </div>
              <div className="solace-settings-row">
                <div className="solace-settings-row-copy">
                  <h3>Companion panel</h3>
                  <p>Show {companionName} beside your journal while you write.</p>
                </div>
                <button
                  className={`solace-visibility-toggle ${miraVisible ? 'enabled' : ''}`}
                  type="button"
                  role="switch"
                  aria-checked={miraVisible}
                  onClick={() => setMiraVisible((visible) => !visible)}
                >
                  <span>{miraVisible ? 'Shown' : 'Hidden'}</span>
                  <span className="solace-switch-track"><span /></span>
                </button>
              </div>
              <div className="solace-settings-row">
                <div className="solace-settings-row-copy">
                  <h3>Gemini API Key</h3>
                  <p>Add your Google Gemini API key to enable AI reflection.</p>
                </div>
                <label className="solace-settings-field">
                  <span className="solace-visually-hidden">Gemini API Key</span>
                  <input
                    type="password"
                    aria-label="Gemini API Key"
                    value={geminiApiKey}
                    onChange={(event) => {
                      const key = event.target.value.trim()
                      setGeminiApiKey(key)
                      if (key) localStorage.setItem('solace-gemini-key', key)
                      else localStorage.removeItem('solace-gemini-key')
                    }}
                    placeholder={GEMINI_API_KEY ? "•••••••••••••••• (Default key connected)" : "Paste Gemini API key"}
                  />
                </label>
              </div>
              <div className="solace-settings-row">
                <div className="solace-settings-row-copy">
                  <h3>Conversation history</h3>
                  <p>Clear the saved chat and start again with {companionName}’s welcome prompts.</p>
                </div>
                <button className="solace-settings-action" onClick={resetMiraConversation}>Reset conversation</button>
              </div>
            </section>

            <section id="settings-data" ref={dataSettingsRef} className="solace-settings-card" aria-labelledby="settings-data-heading">
              <header className="solace-settings-card-header">
                <h2 id="settings-data-heading">Data &amp; privacy</h2>
                <p>Your journal is stored in this browser. Export a copy or manage your account.</p>
              </header>
              <div className="solace-settings-row">
                <div className="solace-settings-row-copy">
                  <h3>Export journal</h3>
                  <p>Download your entries and saved {companionName} conversation as a JSON file.</p>
                </div>
                <button className="solace-settings-action" onClick={exportJournal}><Download size={14} />Export data</button>
              </div>
              <div className="solace-settings-row">
                <div className="solace-settings-row-copy">
                  <h3>Sign out</h3>
                  <p>Sign out of your current journal session on this device.</p>
                </div>
                <button className="solace-settings-action" type="button" onClick={signOutGuest}>Sign out</button>
              </div>
              <div className="solace-settings-row">
                <div className="solace-settings-row-copy">
                  <h3 style={{ color: '#c0392b' }}>Delete account</h3>
                  <p>Permanently remove your profile, entries, and conversation history from this browser.</p>
                </div>
                <button className="solace-settings-action solace-settings-action-danger" type="button" onClick={deleteGuestAccount}>Delete account</button>
              </div>
            </section>
          </div>
        </main>
      ) : view === 'favorites' ? (
        <main className="solace-archive">
          <div className="solace-archive-inner">
            <header className="solace-archive-heading">
              <p className="solace-date">YOUR JOURNAL</p>
              <h1>Favorites</h1>
              <p>Your saved entries, all in one place.</p>
            </header>
            {favoriteEntries.length > 0 ? (
              <div className="solace-favorites-list">
                {favoriteEntries.map((item) => (
                  <button className="solace-archive-entry" key={item.id} type="button" onClick={() => selectEntry(item.id)}>
                    <span className="solace-archive-entry-copy">
                      <strong>{item.title || 'Untitled entry'}</strong>
                      <span>{item.date}</span>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            ) : entries.some((item) => item.favorite) ? (
              <p className="solace-archive-empty">No favorites match your search.</p>
            ) : (
              <section className="solace-favorites-empty" aria-labelledby="solace-favorites-empty-heading">
                <Bookmark size={20} aria-hidden="true" />
                <h2 id="solace-favorites-empty-heading">No favorites yet</h2>
                <p>Open an entry and choose “Add to favorites” from its options menu to save it here.</p>
                <button type="button" onClick={openToday}>Back to journal</button>
              </section>
            )}
          </div>
        </main>
      ) : view === 'entries' ? (
        <main className="solace-archive">
          <div className="solace-archive-inner">
            <header className="solace-archive-heading">
              <p className="solace-date">YOUR JOURNAL</p>
              <h1>All entries</h1>
              <p>Find your way back to a day worth remembering.</p>
            </header>
            <div className="solace-archive-toolbar">
              <div className="solace-archive-period" ref={archivePeriodRef}>
                <div className="solace-archive-picker">
                  <button
                    className={`solace-archive-picker-trigger ${archivePickerOpen === 'month' ? 'open' : ''}`}
                    type="button"
                    aria-label="Choose archive month"
                    aria-haspopup="true"
                    aria-expanded={archivePickerOpen === 'month'}
                    onClick={() => setArchivePickerOpen((open) => open === 'month' ? '' : 'month')}
                  >
                    {archiveMonth.toLocaleDateString('en-US', { month: 'long' })}
                    <ChevronDown size={14} />
                  </button>
                  {archivePickerOpen === 'month' && <div className="solace-archive-picker-menu solace-archive-month-menu" aria-label="Choose month">
                    <p>MONTH</p>
                    <div className="solace-archive-month-options">
                      {Array.from({ length: 12 }, (_, month) => {
                        const monthName = new Date(2000, month, 1).toLocaleDateString('en-US', { month: 'short' })
                        const selected = archiveMonth.getMonth() === month
                        return <button
                          key={month}
                          className={selected ? 'selected' : ''}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setArchiveMonth(new Date(archiveMonth.getFullYear(), month, 1))
                            setCalendarDate(null)
                            setArchivePickerOpen('')
                          }}
                        >{monthName}</button>
                      })}
                    </div>
                  </div>}
                </div>
                <div className="solace-archive-picker">
                  <button
                    className={`solace-archive-picker-trigger solace-archive-year-trigger ${archivePickerOpen === 'year' ? 'open' : ''}`}
                    type="button"
                    aria-label="Choose archive year"
                    aria-haspopup="true"
                    aria-expanded={archivePickerOpen === 'year'}
                    onClick={() => setArchivePickerOpen((open) => open === 'year' ? '' : 'year')}
                  >
                    {archiveMonth.getFullYear()}
                    <ChevronDown size={14} />
                  </button>
                  {archivePickerOpen === 'year' && <div className="solace-archive-picker-menu solace-archive-year-menu" aria-label="Choose year">
                    <p>YEAR</p>
                    <div className="solace-archive-year-options">
                      {archiveYears.map((year) => {
                        const selected = archiveMonth.getFullYear() === year
                        return <button
                          key={year}
                          className={selected ? 'selected' : ''}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setArchiveMonth(new Date(year, archiveMonth.getMonth(), 1))
                            setCalendarDate(null)
                            setArchivePickerOpen('')
                          }}
                        >{year}</button>
                      })}
                    </div>
                  </div>}
                </div>
              </div>
              <div className="solace-archive-tag-filter">
                <span>Filter by tag</span>
                <NookDropdown
                  className="solace-archive-tag-dropdown"
                  ariaLabel="Filter entries by tag"
                  menuTitle="FILTER BY TAG"
                  value={archiveTag}
                  options={[
                    { value: '', label: 'All tags' },
                    ...archiveTags.map((tag) => ({ value: tag, label: tag })),
                  ]}
                  onChange={setArchiveTag}
                />
              </div>
              <div className="solace-archive-view-toggle" role="group" aria-label="Archive view">
                <button className={archiveMode === 'list' ? 'active' : ''} type="button" aria-pressed={archiveMode === 'list'} onClick={() => setArchiveMode('list')}><List size={15} />List</button>
                <button className={archiveMode === 'calendar' ? 'active' : ''} type="button" aria-pressed={archiveMode === 'calendar'} onClick={() => setArchiveMode('calendar')}><CalendarDays size={15} />Calendar</button>
              </div>
            </div>
            {calendarDate && <div className="solace-archive-date-filter">
              <span>{selectedDateLabel} · {selectedDateCount} {selectedDateCount === 1 ? 'entry' : 'entries'}</span>
              <button type="button" aria-label="Clear date filter" title="Clear date filter" onClick={() => setCalendarDate(null)}><X size={14} /></button>
            </div>}
            {archiveMode === 'calendar' ? (
              <>
                <div className="solace-archive-calendar" role="grid" aria-label={`${archiveMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} entries`}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div className="solace-archive-weekday" key={day}>{day}</div>)}
                  {calendarDays.map(({ date, key, inMonth }) => {
                    const dayEntries = monthEntries.filter((item) => getEntryDateKey(item) === key)
                    return (
                      <section className={`solace-archive-day ${inMonth ? '' : 'outside'} ${calendarDate === key ? 'selected' : ''}`} role="gridcell" key={key}>
                        <button className={`solace-archive-day-number ${getLocalDateKey(new Date()) === key ? 'today' : ''}`} type="button" aria-label={`Filter ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`} aria-pressed={calendarDate === key} onClick={() => {
                          if (!inMonth) setArchiveMonth(new Date(date.getFullYear(), date.getMonth(), 1))
                          setCalendarDate((selected) => selected === key ? null : key)
                        }}>{date.getDate()}</button>
                        {dayEntries.slice(0, 3).map((item) => (
                          <button key={item.id} className="solace-archive-day-entry" type="button" title={item.title || 'Untitled entry'} onClick={() => selectEntry(item.id)}>{item.title || 'Untitled entry'}</button>
                        ))}
                        {dayEntries.length > 3 && <span className="solace-archive-day-more">+{dayEntries.length - 3} more</span>}
                      </section>
                    )
                  })}
                </div>
                {!calendarDate && monthEntries.length === 0 && <p className="solace-archive-empty">No entries in this month yet.</p>}
                {calendarDate && <section className="solace-archive-selected-day" aria-label={`Entries for ${selectedDateLabel}`}>
                  <h2>{selectedDateLabel} <span>{selectedDateCount} {selectedDateCount === 1 ? 'entry' : 'entries'}</span></h2>
                  {archiveEntries.map((item) => (
                    <button className="solace-archive-entry" key={item.id} type="button" onClick={() => selectEntry(item.id)}>
                      <span className="solace-archive-entry-copy"><strong>{item.title || 'Untitled entry'}</strong><span>{item.date}</span></span>
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
                  {archiveEntries.length === 0 && <p className="solace-archive-empty">No entries for this day.</p>}
                </section>}
              </>
            ) : (
              <div className="solace-archive-list">
                {Object.entries(archiveGroups).map(([dateKey, dayEntries]) => (
                  <section className="solace-archive-list-day" key={dateKey}>
                    <header><h2>{new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2><span>{dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'}</span></header>
                    {dayEntries.map((item) => (
                      <button className="solace-archive-entry" key={item.id} type="button" onClick={() => selectEntry(item.id)}>
                        <span className="solace-archive-entry-copy"><strong>{item.title || 'Untitled entry'}</strong><span>{item.date}</span></span>
                        <ArrowUpRight size={15} />
                      </button>
                    ))}
                  </section>
                ))}
                {archiveEntries.length === 0 && <p className="solace-archive-empty">{calendarDate ? 'No entries for this day.' : 'No entries in this month yet.'}</p>}
              </div>
            )}
          </div>
        </main>
      ) : (
      <main id="today" className="solace-editor">
        <div className={`solace-editor-inner ${wordCount < 3 ? 'solace-editor-inner-quiet' : ''}`}>
          <header className="solace-entry-header">
            <div><p className="solace-date">{selectedEntry?.date}</p><h1><input
              className="solace-entry-title"
              type="text"
              aria-label="Entry title"
              value={titleValue}
              onChange={(event) => updateEntry({ title: event.target.value })}
              placeholder="A quiet moment"
            /></h1></div>
            <div className="solace-entry-status">
              <button className="solace-mira-home-toggle" type="button" onClick={() => setMiraVisible((visible) => !visible)} aria-label={miraVisible ? 'Hide Mira panel' : 'Show Mira panel'} title={miraVisible ? 'Hide Mira panel' : 'Show Mira panel'}>
                {miraVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                <span>{miraVisible ? 'Hide Mira' : 'Show Mira'}</span>
              </button>
              <button className="solace-site-options" aria-label="Open site options" onClick={() => setView('settings')}><Settings2 size={15} /><span>Options</span></button>
              <span className="solace-save-status"><i />{saved ? 'Saved' : 'Saving...'}</span>
              <button aria-label="Entry options" onClick={() => setOptionsOpen((open) => !open)}><MoreHorizontal size={18} /></button>
              {optionsOpen && <div className="solace-options-menu">
                <button onClick={toggleFavorite}>{selectedEntry?.favorite ? 'Remove from favorites' : 'Add to favorites'}</button>
                <button onClick={() => {
                  addTag()
                  setOptionsOpen(false)
                }}>Add tag</button>
                <button className="danger" onClick={deleteEntry}>Delete entry</button>
              </div>}
            </div>
          </header>

          <div className="solace-entry-tags">
            {selectedEntry?.tags.map((tag) => (
              <button key={tag} className={`tag-tone-${getTagTone(tag)}`} aria-label={`Remove ${tag} tag`} onClick={() => updateEntry({ tags: selectedEntry.tags.filter((item) => item !== tag) })}>{tag}</button>
            ))}
          </div>
          {tagComposerOpen && (
            <form className="solace-inline-form solace-entry-tag-form" onSubmit={(event) => {
              event.preventDefault()
              const value = tagDraft.trim().toLowerCase()
              if (value && !selectedEntry.tags.includes(value)) updateEntry({ tags: [...selectedEntry.tags, value] })
              setTagComposerOpen(false)
              setTagDraft('')
            }}>
              <input aria-label="Tag name" value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} placeholder="Tag name" autoFocus />
              <button type="submit" aria-label="Save tag"><Plus size={13} /></button>
            </form>
          )}

          <textarea ref={editorRef} aria-label="Diary entry" value={entry} onChange={(event) => {
            const body = event.target.value
            const titleIsAutomatic = !selectedEntry.title
              || selectedEntry.title === 'Untitled reflection'
              || selectedEntry.title === getDraftTitle(selectedEntry.body || '')
            const title = titleIsAutomatic ? getDraftTitle(body) : selectedEntry.title
            updateEntry({ body, title, finished: false })
          }} placeholder="Start with whatever is present." />

          {selectedEntry?.attachment && <img className="solace-attachment" src={selectedEntry.attachment} alt={selectedEntry.attachmentName || 'Entry attachment'} />}
          {selectedEntry?.audioUrl && <audio className="solace-audio" controls src={selectedEntry.audioUrl} />}

          <div className="solace-editor-footer">
            <div className="solace-editor-tools">
              <input ref={imageInputRef} type="file" accept="image/*" onChange={attachImage} hidden />
              <button aria-label="Attach image" onClick={() => imageInputRef.current?.click()}><Image size={17} /></button>
              <button aria-label={recording ? 'Stop recording' : 'Record audio'} className={recording ? 'recording' : ''} onClick={toggleRecording}><Mic size={17} /></button>
              <span>{wordCount} words</span>
            </div>
            <button className={`solace-finish ${selectedEntry?.finished ? 'finished' : ''}`} onClick={finishEntry} disabled={selectedEntry?.finished}>{selectedEntry?.finished ? 'Entry finished' : 'Finish entry'}{!selectedEntry?.finished && <ArrowUpRight size={15} />}</button>
          </div>

          {entry.trim() && <div className="solace-prompt"><Sparkles size={14} /><p>A gentle prompt for later: <span>What would you like to make more room for?</span></p></div>}
        </div>
      </main>
      )}

      {view !== 'settings' && view !== 'landing' && view !== 'entries' && view !== 'favorites' && miraVisible && <>
      <div
        className="solace-resizer"
        role="separator"
        aria-label={`Resize ${companionName} panel`}
        aria-controls="mira-panel"
        aria-orientation="vertical"
        aria-valuemin={260}
        aria-valuemax={Math.min(460, window.innerWidth - sidebarWidth - 416)}
        aria-valuenow={companionWidth}
        tabIndex={0}
        onPointerDown={(event) => startSidebarResize('companion', event)}
        onPointerMove={moveSidebarResize}
        onPointerUp={finishSidebarResize}
        onPointerCancel={finishSidebarResize}
        onKeyDown={(event) => handleResizeKeyDown('companion', event)}
      />
      <aside className="solace-companion" id="mira-panel">
        <header>
          <div><p>Your companion</p><h2>{companionName}</h2></div>
          <div className="solace-companion-actions">
            <div className="solace-presence"><i /><span>Here with you</span></div>
            <button className="solace-hide-mira" type="button" aria-label={`Hide ${companionName} panel`} title={`Hide ${companionName} panel`} onClick={() => setMiraVisible(false)}><EyeOff size={15} /></button>
          </div>
        </header>
        <div className="solace-chat">
          {visibleMessages.map((item, index) => (
            <div key={index} className={`solace-message ${item.role}`}>
              {item.role === 'companion' && <div className="solace-mira-icon"><Sparkles size={13} /></div>}
              <div>{item.text}</div>
            </div>
          ))}
          {miraTyping && (
            <div className="solace-message companion">
              <div className="solace-mira-icon"><Sparkles size={13} /></div>
              <div className="solace-mira-typing"><span /><span /><span /></div>
            </div>
          )}
          {messages.length > 1 && (
            <button className="solace-conversation-toggle" onClick={() => setConversationExpanded((expanded) => !expanded)}>
              {conversationExpanded ? 'Show latest reflection' : `Show conversation · ${messages.length} messages`}
            </button>
          )}
        </div>
        <div className="solace-chat-compose">
          <div className="solace-input-row">
            <input aria-label={`Message ${companionName}`} value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && !miraTyping && sendMessage()} placeholder={`Talk to ${companionName}...`} disabled={miraTyping} />
            <button aria-label="Send message" onClick={() => sendMessage()} disabled={miraTyping}><ArrowUp size={15} /></button>
          </div>
          <details className="solace-suggestions" ref={reflectionIdeasRef}>
            <summary><Sparkles size={13} />Reflection ideas</summary>
            <div>
              <button disabled={miraTyping} onClick={() => {
                sendMessage('Help me reflect')
                reflectionIdeasRef.current.open = false
              }}>Help me reflect</button>
              <button disabled={miraTyping} onClick={() => {
                sendMessage('Find a pattern')
                reflectionIdeasRef.current.open = false
              }}>Find a pattern</button>
            </div>
          </details>
          <div className="solace-companion-footer">
            <p>{companionName} is here to support your reflection.</p>
            <div className="solace-gemini-badge-wrap" title="Powered by Google Gemini">
              <img src={`${import.meta.env.BASE_URL}gemini-badge.png`} alt="Powered by Google Gemini" className="solace-gemini-logo-img" />
            </div>
          </div>
        </div>
      </aside>
      </>}
    </div>
  )
}
