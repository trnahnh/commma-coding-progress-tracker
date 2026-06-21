import { Link } from 'react-router-dom'
import { LiveDot } from '../../components/chrome'
import { Reveal } from '../../components/Reveal'
import { INSTALL_PATH } from '../../lib/config'
import { useWaitlistForm } from '../../lib/useWaitlistForm'
import { SectionHead } from './SectionHead'

export function Waitlist() {
  const { email, setEmail, status, message, submit } = useWaitlistForm()

  return (
    <section
      id='install'
      className='py-[clamp(56px,9vw,140px)] border-t border-rule'
    >
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
        <SectionHead
          no='04'
          kicker='get started'
          title={
            <>
              It&apos;s <em className='italic text-accent'>live.</em> Install and
              start logging.
            </>
          }
          aside='free · no card'
        />
        <Reveal>
          <div className='rounded-xl border border-rule-strong bg-paper-2/60 surface px-6 py-9 sm:px-8 sm:py-[clamp(36px,6vw,72px)] lg:px-[clamp(40px,5vw,72px)]'>
            <div className='grid gap-9 lg:gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center'>
              <div className='min-w-0'>
                <p className='font-mono text-[12px] sm:text-[13px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-5 inline-flex items-center gap-2.5'>
                  <LiveDot /> live on two marketplaces
                </p>
                <h3 className='font-serif font-normal text-[clamp(28px,4.5vw,52px)] leading-[1.02] tracking-[-0.02em] m-0 mb-4 text-ink'>
                  Install the extension
                </h3>
                <p className='font-sans text-[15px] sm:text-[16px] leading-relaxed text-ink-soft m-0 max-w-[48ch] mb-7'>
                  On VS Code from the Marketplace, and on Cursor, Windsurf, and
                  VSCodium from Open VSX. Install it, sign in with GitHub, and
                  your sessions, streaks, and heatmaps fill in automatically —
                  free, no card.
                </p>
                <Link
                  to={INSTALL_PATH}
                  className='group inline-flex items-center gap-2.5 h-[52px] px-7 rounded-full font-mono text-[15px] uppercase tracking-wider font-medium
                    bg-accent text-paper border border-accent glow-accent press hover:bg-ink hover:border-ink transition-colors'
                >
                  Install
                  <span className='inline-block transition-transform group-hover:translate-x-1'>
                    →
                  </span>
                </Link>
              </div>

              <div className='min-w-0'>
                <p className='font-mono text-[12px] sm:text-[13px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-5'>
                  Coding in another editor? JetBrains, Neovim, and a CLI are next
                </p>
                {status === 'done' ? (
                  <div className='rounded-lg border border-accent-line bg-accent-soft px-6 py-7 text-center'>
                    <p className='font-mono text-[12px] tracking-[0.18em] uppercase text-accent m-0 mb-2'>
                      You&apos;re on the list
                    </p>
                    <p className='font-sans text-[15px] leading-relaxed text-ink-soft m-0'>
                      We&apos;ll email you the moment your editor lands.
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={submit}
                    noValidate
                    className='flex flex-col gap-3'
                  >
                    <label htmlFor='waitlist-email' className='sr-only'>
                      Email address
                    </label>
                    <div className='flex flex-col sm:flex-row gap-3'>
                      <input
                        id='waitlist-email'
                        type='email'
                        inputMode='email'
                        autoComplete='email'
                        placeholder='you@domain.dev'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={status === 'loading'}
                        aria-invalid={status === 'error'}
                        className='flex-1 min-w-0 h-[54px] px-6 rounded-full bg-paper border border-rule-strong
                          font-mono text-[16px] sm:text-[15px] text-ink placeholder:text-ink-mute
                          focus:outline-none focus:border-accent transition-colors disabled:opacity-60'
                      />
                      <button
                        type='submit'
                        disabled={status === 'loading'}
                        className='group inline-flex items-center justify-center gap-2.5 h-[54px] px-7 rounded-full
                          font-mono text-[15px] uppercase tracking-wider font-medium whitespace-nowrap
                          bg-accent text-paper border border-accent glow-accent press
                          hover:bg-ink hover:border-ink transition-colors disabled:opacity-60'
                      >
                        {status === 'loading' ? 'Joining…' : 'Notify me'}
                        {status !== 'loading' && (
                          <span className='inline-block transition-transform group-hover:translate-x-1'>
                            →
                          </span>
                        )}
                      </button>
                    </div>
                    <p
                      role={status === 'error' ? 'alert' : undefined}
                      className={`font-mono text-[13px] tracking-wide m-0 min-h-[18px] ${
                        status === 'error' ? 'text-accent' : 'text-ink-mute'
                      }`}
                    >
                      {status === 'error'
                        ? message
                        : 'One email when your editor ships. Unsubscribe anytime.'}
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
