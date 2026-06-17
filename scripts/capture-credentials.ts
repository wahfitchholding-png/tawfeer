/**
 * Credential capture via Chrome DevTools (no mitmproxy needed).
 *
 * HOW IT WORKS:
 * Launches a VISIBLE Chrome window (not headless), attaches a network inspector,
 * then waits while you browse. Every API call you trigger gets intercepted and
 * its auth headers are saved automatically to the database.
 *
 * STEPS:
 * 1. Run:  npx tsx scripts/capture-credentials.ts
 * 2. Chrome opens to the target platform's website
 * 3. Browse to ANY restaurant and scroll through the menu
 * 4. Press ENTER in this terminal when done
 * 5. Credentials are saved — future collector runs will use the API directly
 *
 * Run once per platform. Repeat when credentials expire (~6 hours).
 */

import * as readline from 'readline'
import { NetworkCapture } from '@/lib/collectors/capture'
import { listCredentialStatus } from '@/lib/api-clients/credentials'
import type { Platform } from '@/types'

const PLATFORM_URLS: Record<string, string> = {
  TALABAT:   'https://www.talabat.com/uae/dubai-marina',
  DELIVEROO: 'https://deliveroo.ae/restaurants/dubai/dubai-marina?fulfillment_method=delivery',
  CAREEM:    'https://www.careem.com/en-ae/food/restaurants/?lat=25.0805&lng=55.1403',
  KEETA:     'https://www.keeta.com/ae/?lat=25.0805&lng=55.1403',
}

async function captureForPlatform(platform: Platform): Promise<void> {
  const { chromium } = await import('playwright')
  const capture = new NetworkCapture(platform, 'mcdonalds')

  console.log(`\n🌐 Opening Chrome for ${platform}...`)
  console.log(`   Browse to a restaurant, scroll through the menu, then come back here.`)

  const browser = await chromium.launch({
    headless: false, // VISIBLE — user needs to browse
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
    ],
  })

  const context = await browser.newContext({
    geolocation: { latitude: 25.0805, longitude: 55.1403 },
    permissions: ['geolocation'],
    viewport: null, // use window size
    locale: 'en-AE',
    timezoneId: 'Asia/Dubai',
  })

  const page = await context.newPage()
  capture.attach(page)

  await page.goto(PLATFORM_URLS[platform], { waitUntil: 'domcontentloaded' })

  // Wait for user input
  await waitForEnter(`\nBrowse ${platform}, then press ENTER to save credentials...`)

  await capture.persist({ lat: 25.0805, lng: 55.1403 })
  await browser.close()

  console.log(`✓ ${platform} credentials saved.\n`)
}

async function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(prompt, () => {
      rl.close()
      resolve()
    })
  })
}

async function main() {
  const args = process.argv.slice(2)
  const platformArg = args[0]?.toUpperCase() as Platform | undefined

  const platforms: Platform[] = platformArg
    ? [platformArg]
    : ['TALABAT', 'DELIVEROO', 'CAREEM', 'KEETA']

  console.log('='.repeat(60))
  console.log('  Delivery Compare — Credential Capture')
  console.log('='.repeat(60))
  console.log('\nThis script opens a real browser window and captures')
  console.log('the API tokens that the delivery platforms use internally.')
  console.log('\nOnce captured, the collector will use direct API calls')
  console.log('instead of browser scraping — 10x faster and more reliable.\n')

  for (const platform of platforms) {
    await captureForPlatform(platform)
  }

  console.log('\n── Credential Status ──────────────────────────────────')
  const status = await listCredentialStatus()
  for (const s of status) {
    const icon = s.isValid ? '✓' : '✗'
    const exp = s.expiresAt ? `expires ${s.expiresAt.toLocaleString()}` : 'no expiry'
    console.log(`${icon} ${s.platform.padEnd(12)} ${s.keys.join(', ')}  (${exp})`)
  }

  console.log('\nDone. Run "npm run collect" to test the API-first collectors.\n')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
