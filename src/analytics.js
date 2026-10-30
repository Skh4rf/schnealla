export const analyticsPreferenceKey = 'schnealla.analyticsPreference'
export const umamiWebsiteId = '6aada232-f3f7-4e31-82b4-28f15b28d08c'
const productionHost = 'schnealla.j-metzler.at'
const hookName = 'schneallaAnalyticsBeforeSend'

export function createAnalytics({ browser, document, getStorage }) {
  let preference = null
  let error = ''
  let script = null
  let counted = false
  let initialized = false
  const listeners = new Set()
  const state = () => ({ preference, error })
  const notify = () => listeners.forEach((listener) => listener(state()))
  const permitted = () => {
    if (preference !== true || browser.location.hostname !== productionHost) return false
    try {
      return getStorage().getItem(analyticsPreferenceKey) === 'granted-v1'
    } catch {
      return false
    }
  }
  const pagePayload = () => {
    const pages = {
      '/': 'Schnealla', '/index.html': 'Schnealla',
      '/impressum.html': 'Impressum · Schnealla',
      '/datenschutz.html': 'Datenschutz · Schnealla',
    }
    const path = browser.location.pathname
    if (!pages[path]) return false
    let referrer = ''
    try { referrer = new URL(document.referrer).origin } catch { /* No referrer. */ }
    return {
      website: umamiWebsiteId, hostname: productionHost,
      url: path, title: pages[path], referrer,
      language: browser.navigator.language,
      screen: `${browser.screen.width}x${browser.screen.height}`,
    }
  }
  // Disable automatic tracking and allow only one sanitized pageview per visit.
  // The hook also blocks late sends after withdrawal, including in another tab.
  browser[hookName] = (type) => permitted() && type === 'event' ? pagePayload() : false
  const countPage = () => {
    if (!permitted() || counted || !browser.umami?.track) return
    const payload = pagePayload()
    if (!payload) return
    counted = true
    const onError = () => {
      error = 'Die Statistik ist derzeit nicht erreichbar. Du kannst normal weiterspielen.'
      notify()
    }
    try { Promise.resolve(browser.umami.track(payload)).catch(onError) } catch { onError() }
  }
  const apply = () => {
    if (!permitted()) {
      script?.remove()
      script = null
      counted = false
      return
    }
    if (browser.umami?.track) { countPage(); return }
    if (script) return
    const element = document.createElement('script')
    element.defer = true
    element.src = 'https://cloud.umami.is/script.js'
    element.referrerPolicy = 'origin'
    element.setAttribute('data-website-id', umamiWebsiteId)
    element.setAttribute('data-domains', productionHost)
    element.setAttribute('data-auto-track', 'false')
    element.setAttribute('data-before-send', hookName)
    element.onload = countPage
    element.onerror = () => {
      if (script !== element) return
      element.remove()
      script = null
      error = 'Die Statistik ist derzeit nicht erreichbar. Du kannst normal weiterspielen.'
      notify()
    }
    script = element
    document.head.appendChild(element)
  }
  const restore = () => {
    error = ''
    try {
      const saved = getStorage().getItem(analyticsPreferenceKey)
      preference = saved === 'granted-v1' ? true : saved === 'denied-v1' ? false : null
    } catch {
      preference = false
      error = 'Analytics bleibt aus, weil deine Auswahl im Browser nicht gespeichert werden kann.'
    }
    apply()
    notify()
    return state()
  }
  const onStorage = (event) => {
    if (event.key === analyticsPreferenceKey || event.key === null) restore()
  }
  return {
    state,
    subscribe(listener) { listeners.add(listener); listener(state()); return () => listeners.delete(listener) },
    init() {
      if (!initialized) { browser.addEventListener('storage', onStorage); initialized = true }
      return restore()
    },
    setPreference(allowed) {
      preference = false
      error = ''
      try {
        getStorage().setItem(analyticsPreferenceKey, allowed ? 'granted-v1' : 'denied-v1')
        preference = allowed
      } catch {
        error = 'Analytics bleibt aus, weil deine Auswahl im Browser nicht gespeichert werden kann.'
      }
      apply()
      notify()
      return state()
    },
    destroy() {
      preference = false
      apply()
      browser.removeEventListener('storage', onStorage)
      initialized = false
      listeners.clear()
    },
  }
}

export const analytics = typeof window === 'undefined' ? null : createAnalytics({
  browser: window, document, getStorage: () => window.localStorage,
})
