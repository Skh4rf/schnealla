import { analytics } from './analytics.js'

const controls = document.querySelectorAll('[data-analytics-toggle]')
const status = document.querySelector('[data-analytics-status]')
analytics.subscribe(({ preference, error }) => {
  controls.forEach((control) => { control.checked = preference === true })
  if (status) status.textContent = error || (preference === true
    ? 'Analytics ist erlaubt. Abwählen beendet die weitere Erfassung.'
    : 'Analytics ist ausgeschaltet.')
})
controls.forEach((control) => {
  control.addEventListener('change', () => analytics.setPreference(control.checked))
})
analytics.init()
