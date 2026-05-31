import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import SessionDetail from './pages/SessionDetail.tsx'
import NotFound from './pages/NotFound.tsx'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/sessions/:id', element: <SessionDetail /> },
  { path: '*', element: <NotFound /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
