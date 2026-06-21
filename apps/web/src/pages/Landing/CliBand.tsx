import { Link } from 'react-router-dom'
import { Reveal } from '../../components/Reveal'

export function CliBand() {
  return (
    <section className='py-[clamp(56px,9vw,140px)] border-t border-rule'>
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
        <Reveal>
          <div className='rounded-2xl border border-rule-strong bg-paper-2/50 surface px-6 sm:px-10 py-9 sm:py-12 flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12'>
            <div className='min-w-0 flex-1'>
              <p className='font-mono text-[13px] tracking-[0.16em] text-ink-mute m-0 mb-5'>
                <span className='text-accent'>~ ❯</span> commma watch
              </p>
              <h2 className='font-serif font-normal text-[clamp(30px,5vw,56px)] leading-[1.0] tracking-[-0.02em] m-0 text-ink'>
                Bring your own <em className='italic text-accent'>editor.</em>
              </h2>
              <p className='font-sans text-[15px] sm:text-[16px] leading-relaxed text-ink-soft mt-5 m-0 max-w-[52ch]'>
                Not on VS Code? The headless CLI tracks Neovim, Emacs, Helix, and
                JetBrains from one terminal command — no plugin, same sessions
                and streaks.
              </p>
            </div>
            <Link
              to='/cli'
              className='group shrink-0 inline-flex items-center gap-2.5 min-h-[48px] px-7 rounded-full font-mono text-[13px] sm:text-[14px] uppercase tracking-wider font-medium
                bg-accent text-paper border border-accent glow-accent press hover:bg-ink hover:border-ink transition-colors'
            >
              Explore the CLI
              <span className='inline-block transition-transform group-hover:translate-x-1'>
                →
              </span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
