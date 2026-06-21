import { useState, type FormEvent } from 'react'
import { joinWaitlist } from './api'
import { isValidWaitlistEmail, waitlistErrorMessage } from './waitlist'

export type WaitlistStatus = 'idle' | 'loading' | 'done' | 'error'

export function useWaitlistForm() {
  const [email, setEmailValue] = useState('')
  const [status, setStatus] = useState<WaitlistStatus>('idle')
  const [message, setMessage] = useState('')

  const setEmail = (value: string) => {
    setEmailValue(value)
    if (status === 'error') setStatus('idle')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (status === 'loading') return
    const value = email.trim()
    if (!isValidWaitlistEmail(value)) {
      setStatus('error')
      setMessage('Enter a valid email address.')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      await joinWaitlist(value)
      setStatus('done')
      setEmailValue('')
    } catch (err) {
      setStatus('error')
      setMessage(waitlistErrorMessage(err))
    }
  }

  return { email, setEmail, status, message, submit }
}
