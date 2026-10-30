import test from 'node:test'
import assert from 'node:assert/strict'
import { createAnalytics, analyticsPreferenceKey, umamiWebsiteId } from '../src/analytics.js'

function fixture(saved = null, hostname = 'schnealla.j-metzler.at') {
  const values = new Map(saved === null ? [] : [[analyticsPreferenceKey, saved]])
  const requests = []
  const sends = []
  const listeners = new Map()
  const browser = {
    location: { hostname, pathname: '/', search: '?name=private', hash: '#private' },
    navigator: { language: 'de-AT' }, screen: { width: 390, height: 844 },
    addEventListener: (event, handler) => listeners.set(event, handler),
    removeEventListener: (event) => listeners.delete(event),
  }
  const document = {
    title: 'Private game name must not be sent',
    referrer: 'https://example.com/private/path?name=secret#personal',
    head: { appendChild: (script) => requests.push(script) },
    createElement: () => ({
      attributes: {}, removed: false,
      setAttribute(name, value) { this.attributes[name] = value },
      remove() { this.removed = true },
    }),
  }
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const controller = createAnalytics({ browser, document, getStorage: () => storage })
  const loaded = (script = requests.at(-1)) => {
    browser.umami = {
      track(payload) {
        const sanitized = browser.schneallaAnalyticsBeforeSend('event', payload)
        if (sanitized) sends.push(sanitized)
      },
    }
    script.onload()
  }
  return { controller, values, requests, sends, browser, document, storage, listeners, loaded }
}

test('no Umami request without a separate analytics grant', () => {
  for (const saved of [null, 'denied-v1', 'true', 'granted-v0']) {
    const f = fixture(saved)
    f.values.set('schnealla.storagePreference', 'granted-v1')
    f.controller.init()
    assert.equal(f.requests.length, 0)
    assert.equal(f.sends.length, 0)
  }
})

test('consent loads the supplied script and sends only one sanitized pageview', () => {
  const f = fixture()
  f.controller.init()
  f.controller.setPreference(true)
  assert.equal(f.values.get(analyticsPreferenceKey), 'granted-v1')
  assert.equal(f.requests.length, 1)
  const script = f.requests[0]
  assert.equal(script.src, 'https://cloud.umami.is/script.js')
  assert.equal(script.attributes['data-website-id'], umamiWebsiteId)
  assert.equal(script.attributes['data-auto-track'], 'false')
  assert.equal(script.referrerPolicy, 'origin')
  f.loaded()
  assert.deepEqual(f.sends, [{
    website: umamiWebsiteId, hostname: 'schnealla.j-metzler.at',
    url: '/', title: 'Schnealla', referrer: 'https://example.com',
    language: 'de-AT', screen: '390x844',
  }])
  f.controller.init()
  f.controller.setPreference(true)
  assert.equal(f.sends.length, 1)
  assert.equal(f.requests.length, 1)
})

test('remembered consent enables the next visit and legal pages', () => {
  for (const path of ['/', '/impressum.html', '/datenschutz.html']) {
    const f = fixture('granted-v1')
    f.browser.location.pathname = path
    f.controller.init()
    f.loaded()
    assert.equal(f.sends[0].url, path)
  }
})

test('revocation before a late script load prevents tracking', () => {
  const f = fixture('granted-v1')
  f.controller.init()
  const pending = f.requests[0]
  f.controller.setPreference(false)
  f.loaded(pending)
  assert.equal(pending.removed, true)
  assert.equal(f.sends.length, 0)
  assert.equal(f.values.get(analyticsPreferenceKey), 'denied-v1')
})

test('revocation blocks a loaded tracker and its before-send hook', () => {
  const f = fixture('granted-v1')
  f.controller.init()
  f.loaded()
  f.controller.setPreference(false)
  assert.equal(f.browser.schneallaAnalyticsBeforeSend('event', { name: 'private' }), false)
  assert.equal(f.sends.length, 1)
})

test('another tab withdrawing consent blocks sends even before storage event delivery', () => {
  const f = fixture('granted-v1')
  f.controller.init()
  f.loaded()
  f.values.set(analyticsPreferenceKey, 'denied-v1')
  assert.equal(f.browser.schneallaAnalyticsBeforeSend('event', {}), false)
  f.listeners.get('storage')({ key: analyticsPreferenceKey })
  assert.equal(f.controller.state().preference, false)
})

test('unknown paths and custom events never send private content', () => {
  const f = fixture('granted-v1')
  f.controller.init()
  assert.equal(f.browser.schneallaAnalyticsBeforeSend('identify', { name: 'Anna' }), false)
  f.browser.location.pathname = '/private-player-name'
  f.loaded()
  assert.equal(f.sends.length, 0)
})

test('development and preview hosts never load Umami, even with consent', () => {
  for (const host of ['localhost', '127.0.0.1', 'preview.example.com']) {
    const f = fixture('granted-v1', host)
    f.controller.init()
    f.controller.setPreference(true)
    assert.equal(f.requests.length, 0)
  }
})

test('storage failures leave analytics off without throwing', () => {
  const f = fixture()
  f.storage.getItem = () => { throw new Error('blocked') }
  assert.doesNotThrow(() => f.controller.init())
  assert.equal(f.controller.state().preference, false)
  f.storage.setItem = () => { throw new Error('full') }
  f.controller.setPreference(true)
  assert.equal(f.controller.state().preference, false)
  assert.equal(f.requests.length, 0)
})

test('tracker load and send failures do not break the page', () => {
  const f = fixture('granted-v1')
  f.controller.init()
  assert.doesNotThrow(() => f.requests[0].onerror())
  assert.match(f.controller.state().error, /nicht erreichbar/)
  f.controller.setPreference(true)
  f.browser.umami = { track() { throw new Error('network error') } }
  assert.doesNotThrow(() => f.requests.at(-1).onload())
})
