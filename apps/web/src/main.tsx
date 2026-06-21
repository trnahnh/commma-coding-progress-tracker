import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { defaultShouldDehydrateQuery } from '@tanstack/react-query'
import './index.css'
import { AuthProvider } from './lib/auth.tsx'
import {
  QUERY_CACHE_BUSTER,
  queryClient,
  queryPersister,
} from './lib/queryClient.ts'
import RootLayout from './RootLayout.tsx'
import Landing from './pages/Landing/index.tsx'
import { ON_DOCS_HOST } from './lib/docsRouting.ts'

const SessionDetail = lazy(() => import('./pages/SessionDetail.tsx'))
const Profile = lazy(() => import('./pages/Profile.tsx'))
const Leaderboard = lazy(() => import('./pages/Leaderboard.tsx'))
const Feed = lazy(() => import('./pages/Feed.tsx'))
const AuthCallback = lazy(() => import('./pages/AuthCallback.tsx'))
const SignIn = lazy(() => import('./pages/SignIn.tsx'))
const NotFound = lazy(() => import('./pages/NotFound.tsx'))
const Pricing = lazy(() => import('./pages/Pricing.tsx'))
const Install = lazy(() => import('./pages/Install.tsx'))
const Cli = lazy(() => import('./pages/Cli.tsx'))
const Privacy = lazy(() => import('./pages/Privacy.tsx'))
const Api = lazy(() => import('./pages/Api.tsx'))
const Careers = lazy(() => import('./pages/Careers.tsx'))
const Contact = lazy(() => import('./pages/Contact.tsx'))
const Status = lazy(() => import('./pages/Status.tsx'))
const Terms = lazy(() => import('./pages/Terms.tsx'))
const Changelog = lazy(() => import('./pages/Changelog.tsx'))
const EditProfile = lazy(() => import('./pages/EditProfile.tsx'))
const Teams = lazy(() => import('./pages/Teams.tsx'))
const TeamDashboard = lazy(() => import('./pages/TeamDashboard.tsx'))
const BillingSuccess = lazy(() => import('./pages/BillingSuccess.tsx'))
const Recap = lazy(() => import('./pages/Recap.tsx'))
const About = lazy(() => import('./pages/About.tsx'))
const Docs = lazy(() => import('./pages/Docs.tsx'))
const DocsArticle = lazy(() => import('./pages/DocsArticle.tsx'))

const docsHostChildren = [
  { path: '/', element: <Docs /> },
  { path: '/:slug', element: <DocsArticle /> },
  { path: '*', element: <NotFound /> },
]

const mainHostChildren = [
  { path: '/', element: <Landing /> },
  { path: '/profile', element: <EditProfile /> },
  { path: '/pricing', element: <Pricing /> },
  { path: '/install', element: <Install /> },
  { path: '/cli', element: <Cli /> },
  { path: '/billing/success', element: <BillingSuccess /> },
  { path: '/recap', element: <Recap /> },
  { path: '/sessions/:id', element: <SessionDetail /> },
  { path: '/teams', element: <Teams /> },
  { path: '/teams/:slug', element: <TeamDashboard /> },
  { path: '/:handle', element: <Profile /> },
  { path: '/leaderboard', element: <Leaderboard /> },
  { path: '/feed', element: <Feed /> },
  { path: '/signin', element: <SignIn /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  { path: '/careers', element: <Careers /> },
  { path: '/contact', element: <Contact /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/terms', element: <Terms /> },
  { path: '/changelog', element: <Changelog /> },
  { path: '/api', element: <Api /> },
  { path: '/status', element: <Status /> },
  { path: '/about', element: <About /> },
  { path: '/docs', element: <Docs /> },
  { path: '/docs/:slug', element: <DocsArticle /> },
  { path: '/404', element: <NotFound /> },
  { path: '*', element: <NotFound /> },
]

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: ON_DOCS_HOST ? docsHostChildren : mainHostChildren,
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: QUERY_CACHE_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            defaultShouldDehydrateQuery(query) &&
            query.meta?.persist !== false,
        },
      }}
    >
      <AuthProvider>
        <Suspense>
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
