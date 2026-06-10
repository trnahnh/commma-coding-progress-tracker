import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell } from '../components/chrome'
import { ApiError, updateProfile } from '../lib/api'
import { useAuth } from '../lib/auth'

const PRIVACY_OPTIONS = [
  {
    value: 'full' as const,
    label: 'Full',
    description: 'Show all session data including file paths and keyboard heatmap',
  },
  {
    value: 'summary' as const,
    label: 'Summary',
    description: 'Show sessions but hide file paths and key frequency',
  },
  {
    value: 'off' as const,
    label: 'Off',
    description: 'Hide your profile from public access',
  },
]

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <label className='font-mono text-[11px] uppercase tracking-[0.16em] text-ink-mute'>
        {label}
      </label>
      {children}
      {hint && (
        <p className='font-mono text-[11px] text-ink-faint m-0'>{hint}</p>
      )}
    </div>
  )
}

const inputCls =
  'w-full bg-paper-3 border border-rule rounded px-3 py-2.5 font-mono text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/60 transition-colors'

export default function EditProfile() {
  const { user, token, isLoading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const initialized = useRef(false)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')
  const [school, setSchool] = useState('')
  const [fieldOfStudy, setFieldOfStudy] = useState('')
  const [privacy, setPrivacy] = useState<'full' | 'summary' | 'off'>('full')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !token) navigate('/signin', { replace: true })
  }, [isLoading, token, navigate])

  useEffect(() => {
    if (initialized.current || !user) return
    initialized.current = true
    setDisplayName(user.display_name ?? '')
    setBio(user.bio ?? '')
    setWebsite(user.website ?? '')
    setLocation(user.location ?? '')
    setSchool(user.school ?? '')
    setFieldOfStudy(user.field_of_study ?? '')
    setPrivacy((user.privacy as 'full' | 'summary' | 'off') ?? 'full')
  }, [user])

  useEffect(() => {
    document.title = 'Edit profile · commma'
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    const websiteTrimmed = website.trim()
    if (websiteTrimmed && !/^https?:\/\/.+/.test(websiteTrimmed)) {
      setError('Website must start with http:// or https://')
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      await updateProfile(token, {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        website: websiteTrimmed || null,
        location: location.trim() || null,
        school: school.trim() || null,
        field_of_study: fieldOfStudy.trim() || null,
        privacy,
      })
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to save changes',
      )
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !token) return null

  return (
    <Shell>
      <div className='max-w-[640px]'>
        <Link
          to={user ? `/@${user.handle}` : '/'}
          className='group inline-flex items-center gap-2 font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute hover:text-ink transition-colors mb-8'
        >
          <span className='inline-block transition-transform group-hover:-translate-x-1'>
            ←
          </span>
          {user ? `@${user.handle}` : 'Back'}
        </Link>

        <div className='mb-7'>
          <div className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute mb-1'>
            account
          </div>
          <h1 className='font-serif text-[clamp(28px,4vw,48px)] leading-none tracking-[-0.02em] m-0 text-ink'>
            Edit profile
          </h1>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className='border border-rule-strong rounded bg-linear-to-b from-paper-2 to-paper overflow-hidden divide-y divide-rule'>
            <div className='px-5 sm:px-8 py-6 sm:py-7 flex flex-col gap-5'>
              <div className='font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute'>
                About
              </div>
              <Field label='Display name' hint='Shown on your public profile. Leave blank to use your handle.'>
                <input
                  type='text'
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={64}
                  placeholder={user?.handle ?? ''}
                  className={inputCls}
                />
              </Field>
              <Field label='Bio'>
                <div className='relative'>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={160}
                    rows={2}
                    placeholder='One-line tagline about you or your work'
                    className={`${inputCls} resize-none`}
                  />
                  <span className='absolute bottom-2.5 right-3 font-mono text-[10px] text-ink-faint pointer-events-none'>
                    {bio.length}/160
                  </span>
                </div>
              </Field>
              <Field label='Website'>
                <input
                  type='url'
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  maxLength={256}
                  placeholder='https://yoursite.dev'
                  className={inputCls}
                />
              </Field>
              <Field label='Location'>
                <input
                  type='text'
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={64}
                  placeholder='City, Country'
                  className={inputCls}
                />
              </Field>
            </div>

            <div className='px-5 sm:px-8 py-6 sm:py-7 flex flex-col gap-5'>
              <div className='font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute'>
                Education
              </div>
              <Field label='School'>
                <input
                  type='text'
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  maxLength={128}
                  placeholder='University or bootcamp'
                  className={inputCls}
                />
              </Field>
              <Field label='Field of study'>
                <input
                  type='text'
                  value={fieldOfStudy}
                  onChange={(e) => setFieldOfStudy(e.target.value)}
                  maxLength={64}
                  placeholder='Computer Science'
                  className={inputCls}
                />
              </Field>
            </div>

            <div className='px-5 sm:px-8 py-6 sm:py-7 flex flex-col gap-4'>
              <div className='font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute'>
                Privacy
              </div>
              {PRIVACY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className='flex items-start gap-3 cursor-pointer group'
                >
                  <input
                    type='radio'
                    name='privacy'
                    value={opt.value}
                    checked={privacy === opt.value}
                    onChange={() => setPrivacy(opt.value)}
                    className='mt-0.5 accent-accent'
                  />
                  <div>
                    <span
                      className={`font-mono text-[13px] ${privacy === opt.value ? 'text-ink' : 'text-ink-soft'}`}
                    >
                      {opt.label}
                    </span>
                    <p className='font-mono text-[11px] text-ink-mute m-0 mt-0.5'>
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className='mt-5 flex items-center justify-between gap-4'>
            <div className='min-h-[20px]'>
              {error && (
                <p className='font-mono text-[12px] text-accent m-0'>{error}</p>
              )}
              {saved && (
                <p className='font-mono text-[12px] text-live m-0'>
                  Changes saved
                </p>
              )}
            </div>
            <button
              type='submit'
              disabled={saving}
              className='inline-flex items-center h-[42px] px-6 rounded-full font-mono text-[13px] uppercase tracking-wider bg-accent text-paper border border-accent hover:bg-ink hover:border-ink disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </Shell>
  )
}
