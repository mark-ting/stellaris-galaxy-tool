import { Point } from './GeometryLib'

export class EventHandler {
  /**
   * Creates a new EventHandler.
   * @param {GalaxyApp} App
   */
  constructor (App) {
    this.bindEvent = (el, event, fn) => {
      document.getElementById(el).addEventListener(event, fn, false)
    }
    this.initSidebarEvents(App)
    this.initSettingsEvents(App)
    this.initMapEvents(App)
  }

  /**
   * Binds Sidebar UI events.
   * @param {GalaxyApp} App
   */
  initSidebarEvents (App) {
    this.bindEvent('add-nearby-lanes-btn', 'click', (e) => {
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

    this.bindEvent('remove-nearby-lanes-btn', 'click', (e) => {
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

    this.bindEvent('toggle-system-lock-btn', 'click', (e) => {
      if (!App.activeSystem) {
        return
      }
      App.toggleActiveSystemLock()
      App.update()
    })

    this.bindEvent('reset-btn', 'click', (e) => {
      if (window.confirm('Are you sure you want to reset the map? This cannot be undone!')) {
        App.reset()
        App.clearState()
        window.location.reload()
      }
    })

    this.bindEvent('import-map-btn', 'click', (e) => {
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
  initSettingsEvents (App) {
    this.bindEvent('open-settings-btn', 'click', App.Settings.loadSettings)
    this.bindEvent('save-settings-btn', 'click', App.Settings.saveSettings)
  }

  initMapEvents (App) {
    const getCanvasClickPt = (e) => {
      const canvasRect = e.srcElement.getBoundingClientRect()
      const canvasX = e.clientX - canvasRect.left
      const canvasY = e.clientY - canvasRect.top

      return new Point(canvasX, canvasY)
    }

    this.bindEvent('map', 'mousedown', (e) => {
      const clickPt = getCanvasClickPt(e)
      const clickedSystem = App.getSystemNear(clickPt)
      if (!clickedSystem) {
        return
      }

      if (!App.activeSystem) {
        App.setActiveSystem(clickedSystem)
      } else if (App.activeSystem !== clickedSystem) {
        switch (true) {
          case e.ctrlKey:
            App.toggleHyperlane(App.activeSystem, clickedSystem)
            break

          case e.shiftKey:
            App.toggleHyperlane(App.activeSystem, clickedSystem)
            App.setActiveSystem(clickedSystem)
            break

          default:
            App.setActiveSystem(clickedSystem)
            break
        }
      } else {
        App.setActiveSystem(null)
      }
      App.update()
    })

    this.bindEvent('download-map-btn', 'click', (e) => {
      App.export()
    })
  }
}
