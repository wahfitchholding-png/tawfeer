/**
 * Show the current credential status for all platforms.
 * Run: npm run credentials
 */

import { listCredentialStatus, getDiscoveredEndpoint } from '@/lib/api-clients/credentials'
import type { Platform } from '@/types'

async function main() {
  const platforms: Platform[] = ['TALABAT', 'DELIVEROO', 'CAREEM', 'KEETA']

  console.log('\n── Credential Status ──────────────────────────────────────────\n')

  const status = await listCredentialStatus()

  if (status.length === 0) {
    console.log('No credentials stored yet.')
    console.log('Run: npm run capture\n')
    return
  }

  for (const p of platforms) {
    const s = status.find(x => x.platform === p)
    const menuUrl = await getDiscoveredEndpoint(p, 'mcdonalds', 'menu')

    if (!s) {
      console.log(`✗ ${p.padEnd(12)}  No credentials`)
    } else {
      const icon = s.isValid ? '✓' : '⚠'
      const exp = s.expiresAt
        ? `expires ${s.expiresAt.toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}`
        : 'no expiry set'
      console.log(`${icon} ${p.padEnd(12)}  [${s.keys.join(', ')}]  ${exp}`)
      if (!s.isValid) console.log(`   → Run: npm run capture:${p.toLowerCase()}`)
    }

    if (menuUrl) {
      const shortUrl = menuUrl.length > 70 ? menuUrl.slice(0, 67) + '...' : menuUrl
      console.log(`  API endpoint: ${shortUrl}`)
    } else {
      console.log(`  API endpoint: not yet discovered (run npm run collect once)`)
    }

    console.log()
  }

  console.log('──────────────────────────────────────────────────────────────')
  console.log('Credentials with ✓ → API mode active (fast)')
  console.log('Credentials with ✗ → will use Playwright fallback (slow, captures new creds)')
  console.log('Credentials with ⚠ → expired, re-run capture\n')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
