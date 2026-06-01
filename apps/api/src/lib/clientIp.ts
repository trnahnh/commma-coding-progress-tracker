export function selectClientIp(
  forwarded: string | null,
  remote: string,
  hops: number,
): string {
  if (hops <= 0 || !forwarded) return remote
  const chain = forwarded
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  const index = chain.length - hops
  if (index < 0 || index >= chain.length) return remote
  return chain[index] || remote
}
