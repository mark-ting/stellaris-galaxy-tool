import { Point, Rectangle } from './GeometryLib'
import { QuadTree } from './QuadTree'
import { System, Scenario, Nebula } from './StellarisLib'
import { Renderer } from './Renderer'
import { SettingsHandler } from './SettingsHandler'
import { EventHandler } from './EventHandler'
import { Parser } from './Parser'

export default class GalaxyApp {
  constructor () {
    // Init map spatial data
    this.width = 4000
    this.height = 4000
    this.origin = new Point(-500, 500) // canvas (0, maxY)
    this.bounds = new Rectangle(this.origin, 1000, 1000)
    this.calcLookupTransform()
    this.Renderer = new Renderer(this, 5)
    this.Datapoints = new QuadTree(this.bounds)

    // Init Scenario data
    this.Scenario = new Scenario()
    this.Settings = new SettingsHandler(this.Scenario)
    this.Parser = new Parser()
    this.Events = new EventHandler(this)

    this.Settings.set('name', 'newStellarisMap')

    // UI state
    this.lockedSystems = new Set()
    this.activeSystem = null

    this.updateSidebarUI()
    this.render()
  }

  calcLookupTransform () {
    // Coordinate data bounds
    const minX = this.bounds.tl.x
    const minY = this.bounds.tl.y - this.bounds.h

    // Adjust for coordinate origin offset
    this.translateX = -minX
    this.translateY = -minY

    // Adjust for max bound size
    this.scaleX = this.width / this.bounds.w
    this.scaleY = this.height / this.bounds.h
  }

  inverseTransX (x) {
    return ((x / this.scaleX) - this.translateX)
  }

  inverseTransY (y) {
    return ((y / this.scaleY) - this.translateY)
  }

  reset () {
    this.Scenario.reset()
    this.Datapoints.clear()
    this.lockedSystem = new Set()
    this.activeSystem = null
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

  getSystemNear (clickPt) {
    const adjX = Math.floor(this.inverseTransX(clickPt.x))
    const adjY = Math.floor(this.inverseTransY(clickPt.x))
    const adjClickPt = new Point(adjX, adjY)
    const searchPt = new Point(adjX - 2, adjY + 2) // tl adjust for QuadTree
    const searchRect = new Rectangle(searchPt, 5, 5)

    const matches = this.Datapoints.query(searchRect)
    if (matches.length > 0) {
      const matchDists = matches.map((datapoint) => Point.distance(adjClickPt, datapoint.location))
      const leastDist = Math.min(...matchDists)
      const closestPt = matches[matchDists.indexOf(leastDist)]
      return closestPt.data
    }
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

    // Draw locked systems
    for (const systemId of this.lockedSystems) {
      const system = this.Scenario.getSystem(systemId)
      this.Renderer.drawLockedSystem(system)
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
