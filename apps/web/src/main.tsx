import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import SessionDetail from './pages/SessionDetail.tsx'
import Profile from './pages/Profile.tsx'
import Leaderboard from './pages/Leaderboard.tsx'
import NotFound from './pages/NotFound.tsx'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/sessions/:id', element: <SessionDetail /> },
  { path: '/@:handle', element: <Profile /> },
  { path: '/leaderboard', element: <Leaderboard /> },
  { path: '*', element: <NotFound /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
