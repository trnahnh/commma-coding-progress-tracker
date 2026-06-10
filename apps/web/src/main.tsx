import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './lib/auth.tsx'
import RootLayout from './RootLayout.tsx'
import App from './App.tsx'
import SessionDetail from './pages/SessionDetail.tsx'
import Profile from './pages/Profile.tsx'
import Leaderboard from './pages/Leaderboard.tsx'
import Feed from './pages/Feed.tsx'
import AuthCallback from './pages/AuthCallback.tsx'
import SignIn from './pages/SignIn.tsx'
import NotFound from './pages/NotFound.tsx'
import Pricing from './pages/Pricing.tsx'
import Privacy from './pages/Privacy.tsx'
import Api from './pages/Api.tsx'
import Careers from './pages/Careers.tsx'
import Contact from './pages/Contact.tsx'
import Status from './pages/Status.tsx'
import Terms from './pages/Terms.tsx'
import Changelog from './pages/Changelog.tsx'
import EditProfile from './pages/EditProfile.tsx'

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <App /> },
      { path: '/profile', element: <EditProfile /> },
      { path: '/pricing', element: <Pricing /> },
      { path: '/sessions/:id', element: <SessionDetail /> },
      { path: '/@:handle', element: <Profile /> },
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
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
