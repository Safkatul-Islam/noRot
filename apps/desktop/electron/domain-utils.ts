export function extractDomainFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.trim().toLowerCase()
    if (!hostname) return null
    return hostname
  } catch {
    return null
  }
}

const DOMAIN_RE = /(?:(?:https?:\/\/)?)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)/gi

export function extractDomainFromTitle(title: string): string | null {
  const matches: string[] = []
  for (const m of title.toLowerCase().matchAll(DOMAIN_RE)) {
    const domain = m[1]
    if (!domain) continue
    matches.push(domain)
  }
  if (matches.length === 0) return null
  // Prefer the last match which tends to be the active site.
  return matches[matches.length - 1]
}

