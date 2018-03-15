import { Point, Datapoint } from './QuadTree'

/*
 * StellarisLib.js
 *
 * Static galaxy scenario library for Stellaris.
 * Requires QuadTree.js for positional data structures.
 *
 * Scenario uses a combination of a simple directional graph and undirected graph implementations for systems and hyperlanes.
 * Vertices are unique system IDs and hyperlanes are represented by two adjacency lists.
 * In the undirected adjacency list, links are stored twice (a:b and b:a) for ease of access.
 * In the directed adjacency list, hyperlanes are stored with the smaller system as stems and larger systems as leaves.
 */

export class System {
  constructor (id, name, x, y, init) {
    this.id = id
    this.name = name
    this.location = new Point(x, y)

    if (init) {
      this.init = init
    }
  }

  getDatapoint () {
    return new Datapoint(this.id, this.location)
  }

  static fromObject (obj) {
    return new System(obj.id, obj.name, obj.x, obj.y, obj.init)
  }

  static rehydrate (systemObj) {
    return new System(systemObj.id, systemObj.name, systemObj.location.x, systemObj.location.y, systemObj.init)
  }
}

// TODO: add Nebula functionality
export class Nebula {
  constructor (name, x, y, radius) {
    this.id = Symbol(name)
    this.name = name
    this.location = new Point(x, y)
    this.radius = radius
  }
}

export class Scenario {
  constructor () {
    this.reset()
  }

  reset () {
    this.settings = {
      name: 'defaultName',
      priority: 0,
      isDefault: false,
      numEmpiresMin: 1,
      numEmpiresMax: 10,
      numEmpireDefault: 1,
      fallenEmpireDefault: 0,
      fallenEmpireMax: 0,
      advancedEmpireDefault: 0,
      colonizablePlanetOdds: 0,
      randomHyperlanes: false
    }

    this.systems = {}
    this.adjSystems = {}
    this.hyperlanes = {}
  }

  addSystem (system) {
    if (this.systems[system.id]) { return }

    this.systems[system.id] = system
    this.adjSystems[system.id] = new Set()
    this.hyperlanes[system.id] = new Set()
  }

  removeSystem (system) {
    if (!this.systems[system.id]) { return }

    // clean up bidirectional adjacency list
    for (const adj of this.adjSystems[system.id]) {
      this.adjSystems[adj].delete(system.id)
    }
    delete this.adjSystems[system.id]
    delete this.systems[system.id]
  }

  getSystem (systemId) {
    return this.systems[systemId]
  }

  getSystemDatapoints () {
    const datapoints = []
    for (const systemId in this.systems) {
      datapoints.push(this.getSystem(systemId).getDatapoint())
    }
    return datapoints
  }

  addHyperlane (s1, s2) {
    if (s1 === s2) { return }

    this.adjSystems[s1].add(s2)
    this.adjSystems[s2].add(s1)

    const src = s1 < s2 ? s1 : s2
    const dst = s1 < s2 ? s2 : s1
    this.hyperlanes[src].add(dst)
  }

  removeHyperlane (s1, s2) {
    if (s1 === s2) { return }

    this.adjSystems[s1].delete(s2)
    this.adjSystems[s2].delete(s1)

    const src = s1 < s2 ? s1 : s2
    const dst = s1 < s2 ? s2 : s1
    this.hyperlanes[src].delete(dst)
  }

  systemsLinked (s1, s2) {
    return this.adjSystems[s1].has(s2)
  }

  serializeSettings () {
    let settingStr = '\t########\r\n\t#Settings\r\n\t########\r\n'
    settingStr += `\tname = "${this.settings.name}"\r\n`
    settingStr += `\tpriority = ${this.settings.priority}\r\n`
    settingStr += `\tdefault = ${this.settings.isDefault ? 'yes' : 'no'}\r\n`
    settingStr += `\tnum_empires = { min = ${this.settings.numEmpiresMin} max = ${this.settings.numEmpiresMax} }\r\n`
    settingStr += `\tnum_empire_default = ${this.settings.numEmpireDefault}\r\n`
    settingStr += `\tfallen_empire_default = ${this.settings.fallenEmpireDefault}\r\n`
    settingStr += `\tfallen_empire_max = ${this.settings.fallenEmpireMax}\r\n`
    settingStr += `\tadvanced_empire_default = ${this.settings.advancedEmpireDefault}\r\n`
    settingStr += `\tcolonizable_planet_odds = ${this.settings.colonizablePlanetOdds}\r\n`
    settingStr += `\trandom_hyperlanes = ${this.settings.randomHyperlanes ? 'yes' : 'no'}\r\n`
    return settingStr
  }

  serializeSystems () {
    let systemSection = '\t########\r\n\t#Systems\r\n\t########\r\n'
    for (const systemId in this.systems) {
      const system = this.systems[systemId]
      const name = system.name
      const location = system.location
      const nameIdStr = `id = "${systemId}" name = "${name}"`
      const posStr = ` position = { x = ${-location.x} y = ${location.y} }`
      const initStr = system.init ? `initializer = ${system.init}` : ''
      systemSection += `\tsystem = { ${nameIdStr} ${posStr} ${initStr}}\r\n`
    }
    return systemSection
  }

  serializeHyperlanes () {
    let hyperlaneSection = '\t###########\r\n\t#Hyperlanes\r\n\t###########\r\n'
    for (const src in this.hyperlanes) {
      const destinations = this.hyperlanes[src]
      for (const dst of destinations) {
        if (dst) {
          hyperlaneSection += `\tadd_hyperlane = { from = "${src}" to = "${dst}" }\r\n`
        }
      }
    }
    return hyperlaneSection
  }

  serializeNebulae () {
    let nebulaSection = '\t########\r\n\t#Nebulae\r\n\t########\r\n'
    // TODO: add Nebula serialization
    nebulaSection += '\t# If you see this, remind mat3049 to add this functionality.'
    return nebulaSection
  }

  serialize () {
    const doubleCRLF = '\r\n\r\n'
    const preamble = 'static_galaxy_scenario = {\r\n'
    const postamble = '\t# Exported by GalaxyApp v0.0.1\r\n}'
    return [preamble, this.serializeSettings(), this.serializeSystems(), this.serializeHyperlanes(), this.serializeNebulae(), postamble].join(doubleCRLF)
  }
}
