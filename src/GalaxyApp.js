import { Point, Rectangle } from './GeometryLib'
import { QuadTree } from './QuadTree'
import { System, Scenario, Nebula } from './StellarisLib'
import { Layer, Renderer } from './Renderer'
import { SettingsHandler } from './SettingsHandler'
import { Parser } from './Parser'

export default class GalaxyApp {
  constructor () {
    // Init base canvas params
    this.width = 4000
    this.height = 4000
    this.origin = new Point(-500, 500) // canvas (0, maxY)
    this.bounds = new Rectangle(this.origin, 1000, 1000)

    this.Parser = new Parser()

    // Init map scenario data structures
    this.Scenario = new Scenario()
    this.Settings = new SettingsHandler(this.Scenario)
    this.Datapoints = new QuadTree(this.bounds)

    this.Settings.set('name', 'newStellarisMap')

    // UI state
    this.lockedSystems = new Set()
    this.activeSystem = null

    this.initRenderer()
    this.initMapEvents()
    this.initSidebarEvents()
    this.updateSidebarUI()
  }

  reset () {
    this.Scenario.reset()
    this.Datapoints = new QuadTree(this.bounds)
    this.lockedSystem = new Set()
    this.activeSystem = null
  }

  initRenderer () {
    const layers = [
      new Layer('text', document.getElementById('text-layer')),
      new Layer('active', document.getElementById('active-layer')),
      new Layer('locked', document.getElementById('locked-layer')),
      new Layer('nebula', document.getElementById('nebula-layer')),
      new Layer('system', document.getElementById('system-layer')),
      new Layer('hyperlane', document.getElementById('hyperlane-layer'))
    ]

    this.Renderer = new Renderer(4000, 4000, 5, this.bounds, layers)
  }

  initMapEvents () {
    const bindEvent = (el, event, fn) => {
      document.getElementById(el).addEventListener(event, fn, false)
    }

    const getClosestPt = (e) => {
      const canvasRect = e.srcElement.getBoundingClientRect()
      const canvasX = e.clientX - canvasRect.left
      const canvasY = e.clientY - canvasRect.top

      // TODO: implement scaling as a separate step
      const adjX = Math.floor(canvasX) / 4 - 500
      const adjY = Math.floor(canvasY) / 4 - 500

      const clickPt = new Point(adjX, adjY)
      const searchPt = new Point(adjX - 2, adjY + 2) // tl-corner adjust
      const searchRect = new Rectangle(searchPt, 5, 5)

      const matches = this.Datapoints.query(searchRect)

      let closestPt = null
      if (matches.length > 0) {
        const matchDists = matches.map((datapoint) => Point.distance(clickPt, datapoint.location))
        const leastDist = Math.min(...matchDists)
        closestPt = matches[matchDists.indexOf(leastDist)]
      }
      return closestPt
    }

    bindEvent('map', 'mousedown', (e) => {
      const closestPt = getClosestPt(e)
      if (!closestPt) {
        return
      }
      const clickedSystem = closestPt.data

      if (!this.activeSystem) {
        this.setActiveSystem(clickedSystem)
      } else if (this.activeSystem !== clickedSystem) {
        switch (true) {
          case e.ctrlKey:
            this.toggleHyperlane(this.activeSystem, clickedSystem)
            break

          case e.shiftKey:
            this.toggleHyperlane(this.activeSystem, clickedSystem)
            this.setActiveSystem(clickedSystem)
            break

          default:
            this.setActiveSystem(clickedSystem)
            break
        }
      } else {
        this.setActiveSystem(null)
      }
      this.update()
    })

    bindEvent('download-map-btn', 'click', (e) => {
      this.export()
    })
  }

  initSidebarEvents () {
    const bindEvent = (el, event, fn) => {
      document.getElementById(el).addEventListener(event, fn, false)
    }

    bindEvent('add-nearby-lanes-btn', 'click', (e) => {
      if (!this.activeSystem || this.lockedSystems.has(this.activeSystem)) {
        return
      }
      const location = this.Scenario.getSystem(this.activeSystem).location
      const searchRadius = parseInt(document.getElementById('link-radius-input').value, 10)
      const results = this.Datapoints.radialQuery(location, searchRadius)
      const resultIds = results.map(datapoint => datapoint.data)

      for (let i = 0; i < results.length; i++) {
        const dst = resultIds[i]
        if (!this.lockedSystems.has(dst)) {
          this.Scenario.addHyperlane(this.activeSystem, dst)
        }
      }
      this.update()
    })

    bindEvent('remove-nearby-lanes-btn', 'click', (e) => {
      if (!this.activeSystem || this.lockedSystems.has(this.activeSystem)) {
        return
      }
      const location = this.Scenario.getSystem(this.activeSystem).location
      const searchRadius = parseInt(document.getElementById('link-radius-input').value, 10)
      const results = this.Datapoints.radialQuery(location, searchRadius)
      const resultIds = results.map(datapoint => datapoint.data)

      for (let i = 0; i < results.length; i++) {
        const dst = resultIds[i]
        if (!this.lockedSystems.has(dst)) {
          this.Scenario.removeHyperlane(this.activeSystem, dst)
        }
      }
      this.update()
    })

    bindEvent('toggle-system-lock-btn', 'click', (e) => {
      if (!this.activeSystem) {
        return
      }
      this.toggleActiveSystemLock()
      this.update()
    })

    bindEvent('reset-btn', 'click', (e) => {
      if (window.confirm('Are you sure you want to reset the map? This cannot be undone!')) {
        this.reset()
        this.clearState()
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

      this.Parser.loadFile(file)
        .then(() => {
          this.reset()
          this.clearState()

          const settings = this.Parser.parseSettings()
          const systems = this.Parser.parseSystems()
          const hyperlanes = this.Parser.parseHyperlanes()
          const nebulae = this.Parser.parseNebulae()

          this.Settings.load(settings)

          // Rebuild Scenario state
          for (let i = 0; i < systems.length; i++) {
            const system = systems[i]
            this.addSystem(system)
          }

          for (let i = 0; i < hyperlanes.length; i++) {
            const hyperlane = hyperlanes[i]
            const src = hyperlane[0]
            const dst = hyperlane[1]
            this.Scenario.addHyperlane(src, dst)
          }

          for (let i = 0; i < nebulae.length; i++) {
            const nebula = nebulae[i]
            this.Scenario.addNebula(nebula)
          }

          this.update()
        })
    })
  }

  getJSON (url) {
    return new Promise((resolve, reject) => {
      let req = new window.XMLHttpRequest()
      req.open('GET', url, true)
      req.onload = function () {
        if (this.readyState === 4 && this.status === 200) {
          resolve(JSON.parse(this.response))
        } else {
          reject(new Error('Failed to GET JSON!'))
        }
      }
      req.onerror = function () {
        reject(new Error(req.statusText))
      }
      req.send()
    })
  }

  addSystem (system) {
    this.Scenario.addSystem(system)
    this.Datapoints.insert(system.getDatapoint())
  }

  async initData () {
    if (localStorage.getItem('prev') === 'set') {
      this.loadState()
    } else {
      let systems = await this.getJSON('./default.json')
      for (let i = 0; i < systems.length; i++) {
        const system = System.rehydrate(systems[i])
        this.addSystem(system)
      }
    }
    this.update()
  }

  setActiveSystem (systemId) {
    if (this.Scenario.getSystem(systemId)) {
      this.activeSystem = systemId
    }
  }

  toggleActiveSystemLock () {
    if (!this.activeSystem) {
      return
    }
    if (this.lockedSystems.has(this.activeSystem)) {
      this.lockedSystems.delete(this.activeSystem)
    } else {
      this.lockedSystems.add(this.activeSystem)
    }
  }

  toggleHyperlane (s1, s2) {
    // No self-loops or interacting with locked systems
    if (s1 === s2 || this.lockedSystems.has(s1) || this.lockedSystems.has(s2)) {
      return
    }

    if (this.Scenario.systemsLinked(s1, s2)) {
      this.Scenario.removeHyperlane(s1, s2)
    } else {
      this.Scenario.addHyperlane(s1, s2)
    }
  }

  render () {
    this.Renderer.clear()

    // Draw systems
    for (const systemId in this.Scenario.systems) {
      const system = this.Scenario.getSystem(systemId)
      this.Renderer.drawSystem(system)
    }

    // Draw active system
    if (this.activeSystem) {
      const system = this.Scenario.getSystem(this.activeSystem)
      this.Renderer.drawActiveSystem(system)
    }

    // Draw hyperlanes
    for (const srcId in this.Scenario.hyperlanes) {
      const destinations = this.Scenario.hyperlanes[srcId]
      for (const dstId of destinations) {
        const src = this.Scenario.getSystem(srcId).location
        const dst = this.Scenario.getSystem(dstId).location
        this.Renderer.drawHyperlane(src, dst)
      }
    }

    // Draw nebula
    for (const nebulaId in this.Scenario.nebulae) {
      const nebula = this.Scenario.nebulae[nebulaId]
      this.Renderer.drawNebula(nebula)
    }
  }

  updateSidebarUI () {
    if (!this.activeSystem) {
      document.getElementById('system-id-display').value = 'None'
      document.getElementById('system-name-display').value = 'None'
      document.getElementById('system-init-display').value = 'None'
      document.getElementById('system-spawn-base-display').value = 'None'
      document.getElementById('system-spawn-add-display').value = 'None'
      document.getElementById('system-country-flag-display').value = 'None'
      document.getElementById('linked-systems-display').value = 'Please select a system.'
      document.getElementById('system-lock-display').value = 'None'
      return
    }

    const system = this.Scenario.getSystem(this.activeSystem)
    document.getElementById('system-id-display').value = system.id
    document.getElementById('system-name-display').value = system.name
    document.getElementById('system-init-display').value = system.hasOwnProperty('init') ? this.Scenario.getSystem(this.activeSystem).init : 'No Initializer'
    document.getElementById('system-spawn-base-display').value = system.hasOwnProperty('spawnBase') ? system.spawnBase : 'N/A'
    document.getElementById('system-spawn-add-display').value = system.hasOwnProperty('spawnAdd') ? system.spawnAdd : 'N/A'
    document.getElementById('system-country-flag-display').value = system.hasOwnProperty('countryFlag') ? system.countryFlag : 'N/A'

    let linkedSystemText = ''
    for (const id of this.Scenario.adjSystems[this.activeSystem]) {
      linkedSystemText += `${id}: ${this.Scenario.getSystem(id).name}\n`
    }
    document.getElementById('linked-systems-display').value = linkedSystemText || 'No linked systems.'
    document.getElementById('system-lock-display').value = this.lockedSystems.has(this.activeSystem) ? 'Locked' : 'Unlocked'
  }

  saveState () {
    const exportedSettings = this.Scenario.settings
    const exportedSystems = this.Scenario.exportSystems()
    const exportedHyperlanes = this.Scenario.exportHyperlanes()
    const exportedNebulae = this.Scenario.exportNebulae()
    const exportedLocks = Array.from(this.lockedSystems)

    localStorage.setItem('prev', 'set')
    localStorage.setItem('settings', JSON.stringify(exportedSettings))
    localStorage.setItem('systems', JSON.stringify(exportedSystems))
    localStorage.setItem('lanes', JSON.stringify(exportedHyperlanes))
    localStorage.setItem('nebulae', JSON.stringify(exportedNebulae))
    localStorage.setItem('locks', JSON.stringify(exportedLocks))
  }

  loadState () {
    if (localStorage.getItem('prev') === 'set') {
      const importedSettings = JSON.parse(localStorage.getItem('settings'))
      const importedSystems = JSON.parse(localStorage.getItem('systems')).map(System.rehydrate)
      const importedHyperlanes = JSON.parse(localStorage.getItem('lanes'))
      const importedNebulae = JSON.parse(localStorage.getItem('nebulae')).map(Nebula.rehydrate)
      const importedLocks = JSON.parse(localStorage.getItem('locks'))

      this.Settings.load(importedSettings)

      for (let i = 0; i < importedSystems.length; i++) {
        const system = importedSystems[i]
        this.addSystem(system)
      }

      for (let i = 0; i < importedNebulae.length; i++) {
        const nebula = importedNebulae[i]
        this.Scenario.addNebula(nebula)
      }

      for (let i = 0; i < importedHyperlanes.length; i++) {
        const s1 = importedHyperlanes[i][0]
        const s2 = importedHyperlanes[i][1]
        this.Scenario.addHyperlane(s1, s2)
      }

      this.lockedSystems = new Set(importedLocks)
      this.update()
    }
  }

  clearState () {
    localStorage.removeItem('prev')
    localStorage.removeItem('systems')
    localStorage.removeItem('nebulae')
    localStorage.removeItem('lanes')
    localStorage.removeItem('locks')
  }

  update () {
    this.saveState()
    this.updateSidebarUI()
    this.render()
  }

  export () {
    const scenarioStr = this.Scenario.serialize()
    const fileName = document.getElementById('map-name-input').value || 'map'
    const file = new Blob([scenarioStr], {
      type: 'text/plain;charset=utf-8'
    })
    const a = document.createElement('a')
    const url = URL.createObjectURL(file)
    a.href = url
    a.download = fileName + '.txt'
    document.body.appendChild(a)
    a.click()
    setTimeout(function () {
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }, 0)
  }
}
