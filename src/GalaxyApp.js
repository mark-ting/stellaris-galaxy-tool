import { Point, Rectangle } from './GeometryLib'
import { QuadTree } from './QuadTree'
import { System, Scenario, Nebula } from './StellarisLib'
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

    // Canvas layers, objects, and readiness state
    this.prerendered = false
    this.primitives = {}
    this.layers = {}

    // UI state
    this.lockedSystems = new Set()
    this.activeSystem = null

    this.initMapLayers()
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

  initMapLayers () {
    this.layers.text = document.getElementById('text-layer')
    this.layers.active = document.getElementById('active-layer')
    this.layers.locked = document.getElementById('locked-layer')
    this.layers.nebula = document.getElementById('nebula-layer')
    this.layers.system = document.getElementById('system-layer')
    this.layers.hyperlane = document.getElementById('hyperlane-layer')
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
      if (!window.confirm('Are you sure you want to import a map? This cannot be undone!')) {
        return
      }

      const fileInput = document.getElementById('import-map-file-input')
      if (fileInput.files.length < 1) {
        return
      }

      const file = fileInput.files[0]
      if (!file.type.match('text.*')) {
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
    // No self-loops and interacting with locked systems
    if (s1 === s2 || this.lockedSystems.has(s1) || this.lockedSystems.has(s2)) {
      return
    }

    if (this.Scenario.systemsLinked(s1, s2)) {
      this.Scenario.removeHyperlane(s1, s2)
    } else {
      this.Scenario.addHyperlane(s1, s2)
    }
  }

  prerender () {
    this.primitives = {}
    const systemSize = 5
    // // OLD Inactive system sprite
    // const defaultSystem = document.createElement('canvas')
    // defaultSystem.width = systemSize
    // defaultSystem.height = systemSize
    // const defaultSystemCtx = defaultSystem.getContext('2d')
    // defaultSystemCtx.fillStyle = 'white'
    // defaultSystemCtx.fillRect(0, 0, systemSize, systemSize)
    // defaultSystemCtx.strokeStyle = 'gray'
    // defaultSystemCtx.strokeRect(0, 0, systemSize, systemSize)
    // this.primitives.defaultSystem = defaultSystem

    // Inactive system sprite
    const defaultSystem = document.createElement('canvas')
    defaultSystem.width = systemSize
    defaultSystem.height = systemSize
    const defaultSystemCtx = defaultSystem.getContext('2d')
    defaultSystemCtx.beginPath()
    defaultSystemCtx.arc(systemSize / 2, systemSize / 2, systemSize / 2, 0, 2 * Math.PI, false)
    defaultSystemCtx.fillStyle = 'gray'
    defaultSystemCtx.strokeStyle = 'lightgray'
    defaultSystemCtx.lineWidth = 1
    defaultSystemCtx.fill()
    defaultSystemCtx.stroke()
    this.primitives.defaultSystem = defaultSystem

    // Inactive system sprite
    const lockedSystem = document.createElement('canvas')
    lockedSystem.width = systemSize
    lockedSystem.height = systemSize
    const lockedSystemCtx = lockedSystem.getContext('2d')
    lockedSystemCtx.beginPath()
    lockedSystemCtx.arc(systemSize / 2, systemSize / 2, systemSize / 2, 0, 2 * Math.PI, false)
    lockedSystemCtx.fillStyle = 'red'
    lockedSystemCtx.strokeStyle = 'orange'
    lockedSystemCtx.lineWidth = 1
    lockedSystemCtx.fill()
    lockedSystemCtx.stroke()
    this.primitives.lockedSystem = lockedSystem

    // Active system sprite
    const activeSystem = document.createElement('canvas')
    activeSystem.width = systemSize
    activeSystem.height = systemSize
    const activeSystemCtx = activeSystem.getContext('2d')
    activeSystemCtx.beginPath()
    activeSystemCtx.arc(systemSize / 2, systemSize / 2, systemSize / 2, 0, 2 * Math.PI, false)
    activeSystemCtx.fillStyle = 'blue'
    activeSystemCtx.strokeStyle = 'cyan'
    activeSystemCtx.lineWidth = 1
    activeSystemCtx.fill()
    activeSystemCtx.stroke()
    this.primitives.activeSystem = activeSystem

    this.prerendered = true
  }

  drawSystem (systemId) {
    const canvas = this.layers.system
    const ctx = canvas.getContext('2d')
    const system = this.Scenario.getSystem(systemId)
    const location = system.location
    ctx.drawImage(this.primitives.defaultSystem, 4 * (location.x + 500) - 2, 4 * (location.y + 500) - 2)
  }

  drawLockedSystem (systemId) {
    const canvas = this.layers.locked
    const ctx = canvas.getContext('2d')
    const system = this.Scenario.getSystem(systemId)
    const location = system.location
    ctx.drawImage(this.primitives.lockedSystem, 4 * (location.x + 500) - 2, 4 * (location.y + 500) - 2)
  }

  drawActiveSystem () {
    if (this.activeSystem) {
      const location = this.Scenario.getSystem(this.activeSystem).location
      const ctx = this.layers.active.getContext('2d')
      ctx.drawImage(this.primitives.activeSystem, 4 * (location.x + 500) - 2, 4 * (location.y + 500) - 2)

      // TODO: move to its own function
      const textCtx = this.layers.text.getContext('2d')
      textCtx.textAlign = 'center'
      textCtx.textBaseline = 'middle'
      textCtx.font = '14px sans-serif'
      textCtx.fillStyle = 'white'
      textCtx.strokeStyle = 'black'
      ctx.lineWidth = 2
      textCtx.shadowOffsetX = 2
      textCtx.shadowOffsetY = 2
      textCtx.shadowColor = 'black'
      textCtx.shadowBlur = 5
      textCtx.strokeText(this.Scenario.getSystem(this.activeSystem).name, 4 * (location.x + 500), 4 * (location.y + 500) - 12)
      textCtx.fillText(this.Scenario.getSystem(this.activeSystem).name, 4 * (location.x + 500), 4 * (location.y + 500) - 12)
    }
  }

  drawNebula (nebulaId) {
    const nebula = this.Scenario.nebulae[nebulaId]
    const location = nebula.location
    const radius = nebula.radius
    const canvas = this.layers.nebula
    const ctx = canvas.getContext('2d')
    ctx.beginPath()

    ctx.arc(4 * (500 - location.x), 4 * (location.y + 500), radius, 0, 2 * Math.PI, false)
    ctx.globalAlpha = 0.25
    ctx.fillStyle = 'magenta'
    ctx.fill()
  }

  drawHyperlane (s1, s2) {
    const ctx = this.layers.hyperlane.getContext('2d')
    const src = this.Scenario.getSystem(s1).location
    const dst = this.Scenario.getSystem(s2).location
    ctx.strokeStyle = 'cyan'
    ctx.lineWidth = 0.75
    ctx.beginPath()
    ctx.moveTo(4 * (src.x + 500), 4 * (src.y + 500))
    ctx.lineTo(4 * (dst.x + 500), 4 * (dst.y + 500))
    ctx.stroke()
  }

  clearLayer (layer) {
    const ctx = layer.getContext('2d')
    ctx.clearRect(0, 0, this.width, this.height)
  }

  render () {
    if (!this.prerendered) {
      this.prerender()
    }

    // Draw systems
    this.clearLayer(this.layers.system)
    for (const systemId in this.Scenario.systems) {
      this.drawSystem(systemId)
    }

    // Draw locked systems
    this.clearLayer(this.layers.locked)
    for (const systemId of this.lockedSystems) {
      this.drawLockedSystem(systemId)
    }

    // Draw active system
    this.clearLayer(this.layers.active)
    this.clearLayer(this.layers.text)
    this.drawActiveSystem()

    // Draw hyperlanes
    this.clearLayer(this.layers.hyperlane)
    for (const src in this.Scenario.hyperlanes) {
      const destinations = this.Scenario.hyperlanes[src]
      for (const dst of destinations) {
        this.drawHyperlane(src, dst)
      }
    }

    // Draw nebula
    this.clearLayer(this.layers.nebula)
    for (const nebulaId in this.Scenario.nebulae) {
      this.drawNebula(nebulaId)
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
