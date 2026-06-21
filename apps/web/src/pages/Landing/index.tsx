import { BackToTop } from '../../components/BackToTop'
import { Footer, Nav } from '../../components/chrome'
import { SceneBackdrop } from '../../components/SceneBackdrop'
import { useSeo } from '../../lib/seo'
import { Activity } from './Activity'
import { CliBand } from './CliBand'
import { Final } from './Final'
import { Hero } from './Hero'
import { HowItWorks } from './HowItWorks'
import { Leaderboard } from './Leaderboard'
import { ProgressBar } from './ProgressBar'
import { Ticker } from './Ticker'
import { Waitlist } from './Waitlist'

export default function Landing() {
  useSeo({
    title: 'commma — every keystroke leaves a mark',
    description:
      'Track your coding like an athlete. Pace, splits, streaks, leaderboards, and a shareable keyboard heatmap.',
  })

  return (
    <div className='min-h-screen flex flex-col'>
      <SceneBackdrop />
      <Nav />
      <ProgressBar />
      <main className='flex-1 animate-page-in'>
        <Hero />
        <Ticker />
        <Activity />
        <HowItWorks />
        <CliBand />
        <Leaderboard />
        <Waitlist />
        <Final />
      </main>
      <Footer />
      <BackToTop />
    </div>
  )
}
