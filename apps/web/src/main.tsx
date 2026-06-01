import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './lib/auth.tsx'
import App from './App.tsx'
import SessionDetail from './pages/SessionDetail.tsx'
import Profile from './pages/Profile.tsx'
import Leaderboard from './pages/Leaderboard.tsx'
import Feed from './pages/Feed.tsx'
import AuthCallback from './pages/AuthCallback.tsx'
import SignIn from './pages/SignIn.tsx'
import NotFound from './pages/NotFound.tsx'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/sessions/:id', element: <SessionDetail /> },
  { path: '/@:handle', element: <Profile /> },
  { path: '/leaderboard', element: <Leaderboard /> },
  { path: '/feed', element: <Feed /> },
  { path: '/signin', element: <SignIn /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  { path: '*', element: <NotFound /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
