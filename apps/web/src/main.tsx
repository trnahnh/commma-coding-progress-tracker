import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './lib/auth.tsx'
import RootLayout from './RootLayout.tsx'
import App from './App.tsx'

const SessionDetail = lazy(() => import('./pages/SessionDetail.tsx'))
const Profile = lazy(() => import('./pages/Profile.tsx'))
const Leaderboard = lazy(() => import('./pages/Leaderboard.tsx'))
const Feed = lazy(() => import('./pages/Feed.tsx'))
const AuthCallback = lazy(() => import('./pages/AuthCallback.tsx'))
const SignIn = lazy(() => import('./pages/SignIn.tsx'))
const NotFound = lazy(() => import('./pages/NotFound.tsx'))
const Pricing = lazy(() => import('./pages/Pricing.tsx'))
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

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <App /> },
      { path: '/profile', element: <EditProfile /> },
      { path: '/pricing', element: <Pricing /> },
      { path: '/billing/success', element: <BillingSuccess /> },
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
      { path: '/404', element: <NotFound /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Suspense>
        <RouterProvider router={router} />
      </Suspense>
    </AuthProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
