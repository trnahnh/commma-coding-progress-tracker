const KEY = 'commma_post_auth_redirect'

export function setPostAuthRedirect(path: string) {
  try {
    sessionStorage.setItem(KEY, path)
  } catch {
    void 0
  }
}

export function takePostAuthRedirect(): string | null {
  try {
    const path = sessionStorage.getItem(KEY)
    if (path) sessionStorage.removeItem(KEY)
    return path && path.startsWith('/') ? path : null
  } catch {
    return null
  }
}
