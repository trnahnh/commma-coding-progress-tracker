const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub ? 'subscribed' : 'unsubscribed'
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const buf = new ArrayBuffer(raw.length)
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export async function subscribePush(token: string): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'unsubscribed'

  const keyRes = await fetch(`${API_BASE_URL}/v1/push/vapid-public-key`)
  if (!keyRes.ok) return 'unsubscribed'
  const { key } = (await keyRes.json()) as { key: string }

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
  })

  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  await fetch(`${API_BASE_URL}/v1/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
  })

  return 'subscribed'
}

export async function unsubscribePush(token: string): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return 'unsubscribed'

  await fetch(`${API_BASE_URL}/v1/push/subscribe`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  })

  await sub.unsubscribe()
  return 'unsubscribed'
}
