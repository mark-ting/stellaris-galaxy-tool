import XRegExp from 'xregexp'
import { System, Nebula } from './StellarisLib'

/**
 * Parser.js
 *
 * Stellaris static galaxy scenario parser using XRegExp.
 */

export class Parser {
  constructor () {
    this.lines = []
  }

  /**
   * Loads .txt file to process into lines.
   * Returns Promise that resolves on split process completion.
   * @param {File} file
   * @returns {Promise}
   * @memberof Parser
   */
  loadFile (file) {
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onerror = () => {
        reader.abort()
        reader.reject(new DOMException('Unable to parse file.'))
      }
      reader.onload = (e) => {
        const contents = e.target.result
        this.lines = contents.split(/\r\n?|\n/)
        resolve(reader.result)
      }
      reader.readAsText(file)
    })
  }

  /**
   * Returns a Settings object with appropriate parsed parameters.
   * @returns
   * @memberof Parser
   */
  parseSettings () {
    const settings = {}

    // TODO: Optimize this.
    const nameExp = XRegExp(`\s*name\\s*=\\s*"(?P<name>[A-Za-z0-9'\ _\./\\-]*)"\\s*`)
    const priorityExp = XRegExp(`\s*priority\\s*=\\s*(?P<priority>[0-9]*)`)
    const isDefaultExp = XRegExp(`\s*default\\s*=\\s*(?P<isDefault>[a-zA-Z]{0,3})`)
    const numEmpiresExp = XRegExp(`\s*num_empires\\s*=\\s*{\\s*min\\s*=\\s*(?P<min>[0-9]*)\\s*max\\s*=\\s*(?P<max>[0-9]*)`)
    const numEmpireDefaultExp = XRegExp(`\s*num_empire_default\\s*=\\s*(?P<default>[0-9]*)`)
    const fallenEmpireDefaultExp = XRegExp(`\s*fallen_empire_default\\s*=\\s*(?P<default>[0-9]*)`)
    const fallenEmpireMaxExp = XRegExp(`\s*fallen_empire_max\\s*=\\s*(?P<max>[0-9]*)`)
    const advancedEmpireDefaultExp = XRegExp(`\s*advanced_empire_default\\s*=\\s*(?P<default>[0-9]*)`)
    const colonizablePlanetOddsExp = XRegExp(`\s*colonizable_planet_odds\\s*=\\s*(?P<odds>[0-9.]*)`)
    const randomHyperlaneExp = XRegExp(`\s*random_hyperlanes\\s*=\\s*(?P<isRandom>[a-zA-Z]{0,3})\b`)

    for (let i = 0; i < this.lines.length; i++) {
      const match = XRegExp.exec(this.lines[i], nameExp)
      if (match) {
        settings.name = match.name
        break
      }
    }

    for (let i = 0; i < this.lines.length; i++) {
      const match = XRegExp.exec(this.lines[i], priorityExp)
      if (match) {
        settings.priority = parseInt(match.priority, 10)
        break
      }
    }

    for (let i = 0; i < this.lines.length; i++) {
      const match = XRegExp.exec(this.lines[i], isDefaultExp)
      if (match) {
        settings.isDefault = (match.isDefault === 'yes')
        break
      }
    }

    for (let i = 0; i < this.lines.length; i++) {
      const match = XRegExp.exec(this.lines[i], numEmpiresExp)
      if (match) {
        settings.numEmpiresMin = parseInt(match.min, 10)
        settings.numEmpiresMax = parseInt(match.max, 10)
        break
      }
    }

    for (let i = 0; i < this.lines.length; i++) {
      const match = XRegExp.exec(this.lines[i], numEmpireDefaultExp)
      if (match) {
        settings.numEmpireDefault = parseInt(match.default, 10)
        break
      }
    }

    for (let i = 0; i < this.lines.length; i++) {
      const match = XRegExp.exec(this.lines[i], fallenEmpireDefaultExp)
      if (match) {
        settings.fallenEmpireDefault = parseInt(match.default, 10)
        break
      }
    }

    for (let i = 0; i < this.lines.length; i++) {
      const match = XRegExp.exec(this.lines[i], fallenEmpireMaxExp)
      if (match) {
        settings.fallenEmpireMaxExp = parseInt(match.max, 10)
        break
      }
    }

    for (let i = 0; i < this.lines.length; i++) {
      const match = XRegExp.exec(this.lines[i], advancedEmpireDefaultExp)
      if (match) {
        settings.advancedEmpireDefault = parseInt(match.default, 10)
        break
      }
    }

    for (let i = 0; i < this.lines.length; i++) {
      const match = XRegExp.exec(this.lines[i], colonizablePlanetOddsExp)
      if (match) {
        settings.colonizablePlanetOdds = parseFloat(match.odds)
        break
      }
    }

    for (let i = 0; i < this.lines.length; i++) {
      const match = XRegExp.exec(this.lines[i], randomHyperlaneExp)
      if (match) {
        settings.randomHyperlanes = (match.isRandom === 'yes')
        break
      }
    }

    return settings
  }

  // TODO: add variable system position parsing support
  parseSystems () {
    const systems = []
    const systemBaseExp = XRegExp(`system\\s*=\\s*{\\s*id\\s*=\\s*"(?P<id>[0-9]+)"\\s*name\\s*=\\s*"(?P<name>[A-Za-z0-9' _.-]*)"`)
    const systemXPosExp = XRegExp(`x\\s*=\\s*((?P<x>[-]?[0-9]+)|{\\s*min\\s*=\\s*(?P<min>[-]?[0-9]+)\\s*max\\s*=\\s*(?P<max>[-]?[0-9]+))`)
    const systemYPosExp = XRegExp(`y\\s*=\\s*((?P<y>[-]?[0-9]+)|{\\s*min\\s*=\\s*(?P<min>[-]?[0-9]+)\\s*max\\s*=\\s*(?P<max>[-]?[0-9]+))`)
    const systemInitExp = XRegExp(`initializer\\s*=\\s*(?P<init>[A-Za-z0-9_]*)`)
    const systemSpawnExp = XRegExp(`spawn_weight\\s*=\\s*{\\s*base\\s*=\\s*(?P<base>[0-9]*)\\s*modifier\\s*=\\s*{\\s*add\\s*=\\s*(?P<add>[0-9]*)\\s*has_country_flag\\s*=\\s*(?P<flag>[A-Za-z0-9_]*)`)

    for (let i = 0; i < this.lines.length; i++) {
      const curLine = this.lines[i]
      const baseMatch = XRegExp.exec(curLine, systemBaseExp)
      if (baseMatch) {
        const system = {
          id: parseInt(baseMatch.id, 10),
          name: baseMatch.name
        }

        const xPosMatch = XRegExp.exec(curLine, systemXPosExp)
        if (xPosMatch) {
          if (xPosMatch.x) {
            system.x = -1 * parseInt(xPosMatch.x, 10)
          } else {
            system.minX = parseInt(xPosMatch.min, 10)
            system.maxX = parseInt(xPosMatch.max, 10)
            system.x = Math.floor(-1 * (system.minX + system.maxX) / 2)
          }
        }

        const yPosMatch = XRegExp.exec(curLine, systemYPosExp)
        if (yPosMatch) {
          if (yPosMatch.y) {
            system.y = parseInt(yPosMatch.y, 10)
          } else {
            system.minY = parseInt(yPosMatch.min, 10)
            system.maxY = parseInt(yPosMatch.max, 10)
            system.y = Math.floor((system.minY + system.maxY) / 2)
          }
        }

        const initMatch = XRegExp.exec(curLine, systemInitExp)
        if (initMatch) {
          system.init = initMatch.init
        }

        const spawnMatch = XRegExp.exec(curLine, systemSpawnExp)
        if (spawnMatch) {
          system.spawnBase = parseInt(spawnMatch.base, 10)
          system.spawnAdd = parseInt(spawnMatch.add, 10)
          system.countryFlag = spawnMatch.flag
        }

        systems.push(System.rehydrate(system))
      }
    }
    return systems
  }

  parseHyperlanes () {
    const hyperlaneExp = XRegExp(`\s*add_hyperlane\\s*=\\s*{\\s*from\\s*=\\s*"(?P<from>[-]?[0-9]+)"\\s*to =\\s*"(?P<to>[-]?[0-9]+)`)
    const hyperlanes = []
    for (let i = 0; i < this.lines.length; i++) {
      const match = XRegExp.exec(this.lines[i], hyperlaneExp)
      if (match) {
        const src = parseInt(match.from, 10)
        const dst = parseInt(match.to, 10)
        hyperlanes.push([src, dst])
      }
    }
    return hyperlanes
  }

  parseNebulae () {
    const nebulaExp = XRegExp(`\s*nebula\\s*=\\s*{\\s*name\\s*=\\s*"(?P<name>[A-Za-z0-9'\ _\./\\-]*)"\\s*position\\s*=\\s*{\\s*x\\s*=\\s*(?P<x>[-]?[0-9]+)\\s*y\\s*=\\s*(?P<y>[-]?[0-9]+)\\s*}\\s*radius\\s*=\\s*(?P<radius>[0-9]+)`)
    const nebulae = []
    for (let i = 0; i < this.lines.length; i++) {
      const match = XRegExp.exec(this.lines[i], nebulaExp)
      if (match) {
        const nebula = new Nebula(match.name, match.x, match.y, match.radius)
        nebulae.push(nebula)
      }
    }
    return nebulae
  }
}
