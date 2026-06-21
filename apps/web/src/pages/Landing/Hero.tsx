import { Link } from 'react-router-dom'
import { LiveDot } from '../../components/chrome'
import { LiveKeyboard } from '../../components/LiveKeyboard'
import { INSTALL_PATH } from '../../lib/config'
import { LATEST_VERSION } from '../../lib/changelog'
import { useLiveCount } from '../../lib/useLiveCount'
import { useScene } from '../../lib/useScene'

const HERO_STATS = [
  { value: '211', unit: 'd', label: 'longest streak' },
  { value: '1.4', unit: 'M', label: 'hours logged' },
  { value: '92', unit: '%', label: 'return next-day' },
] as const

export function Hero() {
  const pulse = useLiveCount(14233)
  const sceneRef = useScene<HTMLElement>()

  return (
    <section ref={sceneRef} className='relative scene-perspective overflow-hidden'>
      <div className='relative z-10 mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)] pt-[clamp(40px,7vw,92px)] pb-[clamp(44px,6vw,88px)]'>
        <div className='flex items-center gap-3.5 mb-8 sm:mb-11 opacity-0 animate-rise-700 delay-100'>
          <LiveDot />
          <span className='font-mono text-[13px] sm:text-[15px] tracking-[0.16em] uppercase text-ink-mute'>
            v{LATEST_VERSION} · free ·{' '}
            <span className='text-ink-soft tnum'>{pulse.toLocaleString()}</span>{' '}
            typing right now
          </span>
        </div>

        <h1 className='font-serif font-normal text-[clamp(46px,11vw,164px)] leading-[0.9] tracking-[-0.04em] m-0 lift-text par-2'>
          <span className='block overflow-hidden reveal-clip py-[0.12em] my-[-0.12em]'>
            <span className='animate-rise-900 delay-120 inline-block'>
              Every keystroke
            </span>
          </span>
          <span className='block overflow-hidden reveal-clip py-[0.12em] my-[-0.12em]'>
            <span className='animate-rise-900 delay-240 inline-block'>
              leaves a <em className='font-serif italic text-accent'>mark</em>
              <span className='caret text-accent'>|</span>
            </span>
          </span>
        </h1>

        <div className='grid md:grid-cols-[1.5fr_1fr] gap-[clamp(28px,5vw,72px)] items-end mt-[clamp(32px,5vw,64px)]'>
          <p className='font-sans text-[clamp(16px,1.3vw,19px)] leading-relaxed text-ink-soft max-w-[48ch] m-0 opacity-0 animate-rise-700 delay-520 par-3'>
            commma turns your editor into a logbook — pace, splits, streaks,
            podiums, all the rituals of a real sport for the work you already do.
            Install once, code as usual, then read the week back like an athlete
            reviewing the tape.
          </p>
          <div className='flex gap-3 items-center flex-wrap md:justify-end opacity-0 animate-rise-700 delay-640'>
            <Link
              to={INSTALL_PATH}
              className='group inline-flex items-center gap-2.5 h-[48px] px-6 rounded-full font-mono text-[15px] uppercase tracking-wider font-medium
                bg-accent text-paper border border-accent glow-accent press hover:bg-ink hover:border-ink transition-colors'
            >
              Install
              <span className='inline-block transition-transform group-hover:translate-x-1'>
                →
              </span>
            </Link>
            <Link
              to='/leaderboard'
              className='inline-flex items-center gap-2.5 h-[48px] px-6 rounded-full font-mono text-[15px] uppercase tracking-wider
                text-ink-soft hover:text-ink border border-rule-strong hover:border-ink-faint transition-colors press'
            >
              See a sample
            </Link>
          </div>
        </div>

        <div className='mt-[clamp(36px,5vw,72px)] opacity-0 animate-rise delay-720 par-1'>
          <LiveKeyboard />
        </div>

        <div className='mt-7 grid grid-cols-2 sm:grid-cols-4 border border-rule rounded-xl overflow-hidden surface bg-paper-2/40 opacity-0 animate-rise-700 delay-720'>
          <div className='px-5 sm:px-7 py-5 border-b sm:border-b-0 border-r border-rule'>
            <span className='flex items-baseline gap-1 font-serif text-[clamp(28px,3.4vw,46px)] leading-none tracking-[-0.02em] tnum'>
              {pulse.toLocaleString()}
            </span>
            <span className='block font-mono text-[12px] sm:text-[13px] tracking-[0.14em] uppercase text-ink-mute mt-2.5'>
              active right now
            </span>
          </div>
          {HERO_STATS.map((s, i) => (
            <div
              key={s.label}
              className={`px-5 sm:px-7 py-5 ${i < 1 ? 'border-b sm:border-b-0' : ''} ${i < 2 ? 'border-r' : ''} border-rule`}
            >
              <span className='flex items-baseline font-serif text-[clamp(28px,3.4vw,46px)] leading-none tracking-[-0.02em] tnum'>
                {s.value}
                <span className='text-ink-mute text-[0.5em] align-baseline ml-0.5'>
                  {s.unit}
                </span>
              </span>
              <span className='block font-mono text-[12px] sm:text-[13px] tracking-[0.14em] uppercase text-ink-mute mt-2.5'>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
