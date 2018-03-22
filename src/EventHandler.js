export class EventHandler {
  /**
   * Creates a new EventHandler.
   * @param {GalaxyApp} App
   */
  constructor (App) {
    console.log(App)
    this.bindEvent = (el, event, fn) => {
      document.getElementById(el).addEventListener(event, fn, false)
    }
    this.initSidebarEvents(App)
    this.initSettingsModalEvents(App)
  }

  /**
   * Binds Sidebar UI events.
   * @param {GalaxyApp} App
   */
  initSidebarEvents (App) {
    const bindEvent = (el, event, fn) => {
      document.getElementById(el).addEventListener(event, fn, false)
    }

    bindEvent('add-nearby-lanes-btn', 'click', (e) => {
      if (!App.activeSystem || App.lockedSystems.has(App.activeSystem)) {
        return
      }
      const location = App.Scenario.getSystem(App.activeSystem).location
      const searchRadius = parseInt(document.getElementById('link-radius-input').value, 10)
      const results = App.Datapoints.radialQuery(location, searchRadius)
      const resultIds = results.map(datapoint => datapoint.data)

      for (let i = 0; i < results.length; i++) {
        const dst = resultIds[i]
        if (!App.lockedSystems.has(dst)) {
          App.Scenario.addHyperlane(App.activeSystem, dst)
        }
      }
      App.update()
    })

    bindEvent('remove-nearby-lanes-btn', 'click', (e) => {
      if (!App.activeSystem || App.lockedSystems.has(App.activeSystem)) {
        return
      }
      const location = App.Scenario.getSystem(App.activeSystem).location
      const searchRadius = parseInt(document.getElementById('link-radius-input').value, 10)
      const results = App.Datapoints.radialQuery(location, searchRadius)
      const resultIds = results.map(datapoint => datapoint.data)

      for (let i = 0; i < results.length; i++) {
        const dst = resultIds[i]
        if (!App.lockedSystems.has(dst)) {
          App.Scenario.removeHyperlane(App.activeSystem, dst)
        }
      }
      App.update()
    })

    bindEvent('toggle-system-lock-btn', 'click', (e) => {
      if (!App.activeSystem) {
        return
      }
      App.toggleActiveSystemLock()
      App.update()
    })

    bindEvent('reset-btn', 'click', (e) => {
      if (window.confirm('Are you sure you want to reset the map? This cannot be undone!')) {
        App.reset()
        App.clearState()
        window.location.reload()
      }
    })

    bindEvent('import-map-btn', 'click', (e) => {
      const fileInput = document.getElementById('import-map-file-input')
      if (fileInput.files.length < 1) {
        return
      }

      if (!window.confirm('Are you sure you want to import a map? This cannot be undone!')) {
        return
      }

      const file = fileInput.files[0]
      if (!file.type.match('text.*')) {
        window.alert('File must be a .txt file!')
        return
      }

      App.Parser.loadFile(file)
        .then(() => {
          App.reset()
          App.clearState()

          const settings = App.Parser.parseSettings()
          const systems = App.Parser.parseSystems()
          const hyperlanes = App.Parser.parseHyperlanes()
          const nebulae = App.Parser.parseNebulae()

          App.Settings.load(settings)

          // Rebuild Scenario state
          for (let i = 0; i < systems.length; i++) {
            const system = systems[i]
            App.addSystem(system)
          }

          for (let i = 0; i < hyperlanes.length; i++) {
            const hyperlane = hyperlanes[i]
            const src = hyperlane[0]
            const dst = hyperlane[1]
            App.Scenario.addHyperlane(src, dst)
          }

          for (let i = 0; i < nebulae.length; i++) {
            const nebula = nebulae[i]
            App.Scenario.addNebula(nebula)
          }

          App.update()
        })
    })
  }

  /**
   * Binds Settings Modal events.
   * @param {GalaxyApp} App
   */
  initSettingsModalEvents (App) {
    this.bindEvent('open-settings-btn', 'click', App.Settings.loadSettings)
    this.bindEvent('save-settings-btn', 'click', App.Settings.saveSettings)
  }

  initCanvasEvents (App) {
  }
}
