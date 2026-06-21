import { Reveal } from '../../components/Reveal'
import { SectionHead } from './SectionHead'

export function HowItWorks() {
  const steps = [
    {
      no: '01',
      title: (
        <>
          Install the <em className='italic text-accent'>extension.</em>
        </>
      ),
      ascii: `┌────────────┐\n│ ●  ●  ●    │\n├────────────┤\n│ > vscode   │\n└────────────┘`,
      body: "One click from the marketplace. Sign in with GitHub, pick a privacy level (every keystroke or just session totals), and you're logging.",
    },
    {
      no: '02',
      title: (
        <>
          Code <em className='italic text-accent'>as usual.</em>
        </>
      ),
      ascii: `┌──────┐   ┌──────┐   ┌──────┐\n│ keys │ → │ evt  │ → │ api  │\n└──────┘   └──────┘   └──────┘`,
      body: 'The extension batches activity locally and syncs it on a heartbeat. No project content ever leaves your machine — only metrics and file paths you allow.',
    },
    {
      no: '03',
      title: (
        <>
          Share, race, <em className='italic text-accent'>brag.</em>
        </>
      ),
      ascii: `◆ feed\n◇ leaderboard\n◇ profile`,
      body: 'Your sessions show up in a public feed (or a private one for your team). Streaks, podiums, and weekly recaps roll up automatically.',
    },
  ]

  return (
    <section className='py-[clamp(56px,9vw,140px)] border-t border-rule'>
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
        <Reveal>
          <SectionHead
            no='02'
            kicker='the loop'
            title={
              <>
                Three pieces. <em className='italic text-accent'>No fuss.</em>
              </>
            }
            aside='extension · api · web'
          />
        </Reveal>
        <div className='grid grid-cols-1 md:grid-cols-3 border-y border-rule'>
          {steps.map((s, i) => (
            <Reveal
              key={s.no}
              delay={i * 110}
              className={`px-5 sm:px-8 py-8 sm:py-10 ${i < 2 ? 'md:border-r' : ''} ${i < 2 ? 'border-b md:border-b-0' : ''} border-rule`}
            >
              <div className='font-mono text-[15px] tracking-[0.16em] text-ink-mute flex items-center gap-3 mb-7'>
                <span className='font-serif text-[22px] text-accent tnum'>
                  {s.no}
                </span>
                <span className='flex-1 h-px bg-rule' />
              </div>
              <pre className='font-mono text-[15px] leading-snug text-accent bg-paper-2 border border-rule px-4 py-3.5 rounded-md mb-6 whitespace-pre overflow-x-auto well'>
                {s.ascii}
              </pre>
              <h3 className='font-serif font-normal text-[28px] leading-tight tracking-[-0.015em] m-0 mb-3.5 text-ink'>
                {s.title}
              </h3>
              <p className='text-[15px] leading-relaxed text-ink-soft m-0 max-w-[36ch]'>
                {s.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
