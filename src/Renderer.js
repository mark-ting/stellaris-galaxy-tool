export class Renderer {
  /**
   * Creates a new Renderer.
   * @param {GalaxyApp} App Parent GalaxyApp.
   * @param {number} [systemSize=5] Size (width/height) of a System sprite in pixels.
   */
  constructor (App, systemSize = 5) {
    // Get transform params from parent
    this.scaleX = App.scaleX
    this.scaleY = App.scaleY
    this.translateX = App.translateX
    this.translateY = App.translateY

    // Assign layers
    this.layers = {
      text: document.getElementById('text-layer'),
      active: document.getElementById('active-layer'),
      locked: document.getElementById('locked-layer'),
      nebula: document.getElementById('nebula-layer'),
      system: document.getElementById('system-layer'),
      hyperlane: document.getElementById('hyperlane-layer')
    }

    // Apply render offset and prerender
    this.calcRenderOffset(systemSize)
    this.prerender()
  }

  calcRenderOffset (systemSize) {
    // Sprite offset functions
    this.systemSize = Math.abs((systemSize % 2 === 0) ? systemSize + 1 : systemSize) // ensure size is odd
    this.systemOffset = Math.floor(this.systemSize / 2)
  }

  transX (x) {
    return (this.scaleX * (x + this.translateX))
  }

  transY (y) {
    return this.scaleY * (y + this.translateY)
  }

  prerender () {
    const systemSize = this.systemSize || 5
    this.sprites = {}

    // Inactive system sprite
    const defaultSystem = document.createElement('canvas')
    defaultSystem.width = systemSize
    defaultSystem.height = systemSize
    const defaultSystemCtx = defaultSystem.getContext('2d')
    defaultSystemCtx.beginPath()
    defaultSystemCtx.arc(this.systemSize / 2, this.systemSize / 2, this.systemSize / 2, 0, 2 * Math.PI, false)
    defaultSystemCtx.fillStyle = 'gray'
    defaultSystemCtx.strokeStyle = 'lightgray'
    defaultSystemCtx.lineWidth = 1
    defaultSystemCtx.fill()
    defaultSystemCtx.stroke()
    this.sprites.defaultSystem = defaultSystem

    // Locked system sprite
    const lockedSystem = document.createElement('canvas')
    lockedSystem.width = systemSize
    lockedSystem.height = systemSize
    const lockedSystemCtx = lockedSystem.getContext('2d')
    lockedSystemCtx.beginPath()
    lockedSystemCtx.arc(this.systemSize / 2, this.systemSize / 2, this.systemSize / 2, 0, 2 * Math.PI, false)
    lockedSystemCtx.fillStyle = 'red'
    lockedSystemCtx.strokeStyle = 'orange'
    lockedSystemCtx.lineWidth = 1
    lockedSystemCtx.fill()
    lockedSystemCtx.stroke()
    this.sprites.lockedSystem = lockedSystem

    // Active system sprite
    const activeSystem = document.createElement('canvas')
    activeSystem.width = systemSize
    activeSystem.height = systemSize
    const activeSystemCtx = activeSystem.getContext('2d')
    activeSystemCtx.beginPath()
    activeSystemCtx.arc(this.systemSize / 2, this.systemSize / 2, this.systemSize / 2, 0, 2 * Math.PI, false)
    activeSystemCtx.fillStyle = 'blue'
    activeSystemCtx.strokeStyle = 'cyan'
    activeSystemCtx.lineWidth = 1
    activeSystemCtx.fill()
    activeSystemCtx.stroke()
    this.sprites.activeSystem = activeSystem

    this.prerendered = true
  }

  drawSystem (system) {
    const canvas = this.layers.system
    const ctx = canvas.getContext('2d')
    const location = system.location
    ctx.drawImage(this.sprites.defaultSystem, this.transX(location.x) - this.systemOffset, this.transY(location.y) - this.systemOffset)
  }

  drawLockedSystem (system) {
    const canvas = this.layers.locked
    const ctx = canvas.getContext('2d')
    const location = system.location
    ctx.drawImage(this.sprites.lockedSystem, this.transX(location.x) - this.systemOffset, this.transY(location.y) - this.systemOffset)
  }

  // Remove system dependency
  drawActiveSystem (system) {
    const location = system.location
    const ctx = this.layers.active.getContext('2d')
    ctx.drawImage(this.sprites.activeSystem, this.transX(location.x) - this.systemOffset, this.transY(location.y) - this.systemOffset)

    // TODO: move to its own function
    const textOffset = 12
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
    textCtx.strokeText(system.name, this.transX(location.x), this.transY(location.y) - textOffset)
    textCtx.fillText(system.name, this.transX(location.x), this.transY(location.y) - textOffset)
  }

  drawNebula (nebula) {
    const location = nebula.location
    const radius = nebula.radius
    const canvas = this.layers.nebula
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    // TODO: fix mirroring of Nebula position
    ctx.arc(this.transX(-location.x), this.transY(location.y), radius, 0, 2 * Math.PI, false)
    ctx.globalAlpha = 0.25
    ctx.fillStyle = 'magenta'
    ctx.fill()
  }

  drawHyperlane (src, dst) {
    const ctx = this.layers.hyperlane.getContext('2d')
    ctx.strokeStyle = 'cyan'
    ctx.lineWidth = 0.75
    ctx.beginPath()
    ctx.moveTo(this.transX(src.x), this.transY(src.y))
    ctx.lineTo(this.transX(dst.x), this.transY(dst.y))
    ctx.stroke()
  }

  clearLayerByName (layerName) {
    const ctx = this.layers[layerName].getContext('2d')
    ctx.clearRect(0, 0, this.width, this.height)
  }

  clear () {
    for (const layerName in this.layers) {
      this.clearLayerByName(layerName)
    }
  }
}
