export class SettingsHandler {
  constructor (Scenario) {
    this.Scenario = Scenario
    this.initSettingsEvents()
  }

  load (settings) {
    Object.assign(this.Scenario.settings, settings)
  }

  set (setting, value) {
    if (!this.Scenario.settings.hasOwnProperty(setting)) {
      console.error(`'${setting}' is not a valid setting.`)
    }
    this.Scenario.settings[setting] = value
  }

  get (setting) {
    if (!this.Scenario.settings.hasOwnProperty(setting)) {
      console.error(`'${setting}' is not a valid setting.`)
      return null
    }
    return this.Scenario.settings[setting]
  }

  initSettingsEvents () {
    const bindEvent = (el, event, fn) => { document.getElementById(el).addEventListener(event, fn, false) }

    const loadSettings = () => {
      document.getElementById('settings-name-input').value = this.get('name')
      document.getElementById('settings-priority-input').value = this.get('priority')
      document.getElementById('settings-empire-min-input').value = this.get('numEmpiresMin')
      document.getElementById('settings-empire-max-input').value = this.get('numEmpiresMax')
      document.getElementById('settings-empire-default-input').value = this.get('numEmpireDefault')
      document.getElementById('settings-fallen-default-input').value = this.get('fallenEmpireDefault')
      document.getElementById('settings-fallen-max-input').value = this.get('fallenEmpireMax')
      document.getElementById('settings-advanced-default-input').value = this.get('advancedEmpireDefault')
      document.getElementById('settings-colonizable-odds-input').value = this.get('colonizablePlanetOdds')
      document.getElementById('settings-default-check').checked = this.get('isDefault')
      document.getElementById('settings-random-hyperlanes-check').checked = this.get('randomHyperlanes')
    }

    const saveSettings = () => {
      this.set('name', document.getElementById('settings-name-input').value)
      this.set('priority', parseInt(document.getElementById('settings-priority-input').value), 10)
      this.set('numEmpiresMin', parseInt(document.getElementById('settings-empire-min-input').value), 10)
      this.set('numEmpiresMax', parseInt(document.getElementById('settings-empire-max-input').value), 10)
      this.set('numEmpireDefault', parseInt(document.getElementById('settings-empire-default-input').value), 10)
      this.set('fallenEmpireDefault', parseInt(document.getElementById('settings-fallen-default-input').value), 10)
      this.set('fallenEmpireMax', parseInt(document.getElementById('settings-fallen-max-input').value), 10)
      this.set('advancedEmpireDefault', parseInt(document.getElementById('settings-advanced-default-input').value), 10)
      this.set('colonizablePlanetOdds', parseFloat(document.getElementById('settings-colonizable-odds-input').value))
      this.set('isDefault', document.getElementById('settings-default-check').checked)
      this.set('randomHyperlanes', document.getElementById('settings-random-hyperlanes-check').checked)
    }

    bindEvent('open-settings-btn', 'click', loadSettings)
    bindEvent('save-settings-btn', 'click', saveSettings)
  }
}
