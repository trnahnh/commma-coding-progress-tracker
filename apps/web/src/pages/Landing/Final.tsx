import { Link } from 'react-router-dom'
import { LiveDot } from '../../components/chrome'
import { Reveal } from '../../components/Reveal'
import { INSTALL_PATH } from '../../lib/config'

export function Final() {
  return (
    <section className='py-[clamp(72px,12vw,200px)] text-center border-t border-rule relative overflow-hidden'>
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
        <Reveal>
          <p className='font-mono text-[13px] sm:text-[15px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-9 inline-flex items-center gap-2.5'>
            <LiveDot /> 2,841 athletes logging right now
          </p>
          <h2 className='font-serif font-normal text-[clamp(46px,10vw,150px)] leading-[0.93] tracking-[-0.04em] m-0 mb-10 mx-auto max-w-[14ch] text-ink lift-text'>
            Stop coding into the <em className='italic text-accent'>void.</em>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
            <Link
              to='/signin'
              className='group inline-flex items-center gap-2.5 h-[52px] px-8 rounded-full font-mono text-[15px] uppercase tracking-wider font-medium bg-accent text-paper border border-accent glow-accent press hover:bg-ink hover:border-ink transition-colors'
            >
              Start free
              <span className='inline-block transition-transform group-hover:translate-x-1'>
                →
              </span>
            </Link>
            <Link
              to={INSTALL_PATH}
              className='group inline-flex items-center gap-2.5 h-[52px] px-8 rounded-full font-mono text-[15px] uppercase tracking-wider font-medium text-ink-soft hover:text-ink border border-rule-strong hover:border-ink-faint transition-colors press'
            >
              Install
              <span className='inline-block transition-transform group-hover:translate-x-1'>
                →
              </span>
            </Link>
          </div>
          <p className='font-mono text-[13px] sm:text-[15px] tracking-wider uppercase text-ink-mute mt-8'>
            free during early access · no card · leave anytime
          </p>
        </Reveal>
      </div>
    </section>
  )
}
