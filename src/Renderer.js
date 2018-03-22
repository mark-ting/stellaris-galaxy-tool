import { Point, Rectangle } from './GeometryLib'

export class Layer {
  constructor (name, canvas) {
    this.canvas = canvas
    this.name = name
  }
}

export class Renderer {
  /**
   * Creates a new Renderer.
   * @param {number} width Width of canvas in pixels.
   * @param {number} height Height of canvas in pixels.
   * @param {number} [systemSize=5] Size (width/height) of a System sprite in pixels.
   * @param {Rectangle} databounds Rectangle representing data source coordinate bounds. Used to calculate data-render offsets.
   * @param {Layer[]} [layerArr=[]] Array of layers.
   */
  constructor (width, height, systemSize = 5, databounds = new Rectangle(new Point(0, 500), 1000, 1000), layerArr = []) {
    this.width = width
    this.height = height

    // Assign layers
    this.layers = {}
    for (let i = 0; i < layerArr.length; i++) {
      const layer = layerArr[i]
      this.layers[layer.name] = layer.canvas
    }

    // Apply render offset
    this.calcRenderOffset(databounds, systemSize)
    this.prerender()
  }

  calcRenderOffset (databounds, systemSize) {
    const minX = databounds.tl.x
    const minY = databounds.tl.y - databounds.h

    // Adjust for coordinate origin offset
    this.translateX = -minX
    this.translateY = -minY

    // Adjust for max bound size
    this.scaleX = this.width / databounds.w
    this.scaleY = this.height / databounds.h

    // Offset functions
    this.systemSize = Math.abs((systemSize % 2 === 0) ? systemSize + 1 : systemSize) // ensure size is odd
    this.systemOffset = Math.floor(this.systemSize / 2)
  }

  offsetX (x) {
    return (this.scaleX * (x + this.translateX))
  }

  offsetY (y) {
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
    ctx.drawImage(this.sprites.defaultSystem, this.offsetX(location.x) - this.systemOffset, this.offsetY(location.y) - this.systemOffset)
  }

  drawLockedSystem (system) {
    const canvas = this.layers.locked
    const ctx = canvas.getContext('2d')
    const location = system.location
    ctx.drawImage(this.sprites.lockedSystem, this.offsetX(location.x) - this.systemOffset, this.offsetY(location.y) - this.systemOffset)
  }

  // Remove system dependency
  drawActiveSystem (system) {
    const location = system.location
    const ctx = this.layers.active.getContext('2d')
    ctx.drawImage(this.sprites.activeSystem, this.offsetX(location.x) - this.systemOffset, this.offsetY(location.y) - this.systemOffset)

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
    textCtx.strokeText(system.name, this.offsetX(location.x), this.offsetY(location.y) - textOffset)
    textCtx.fillText(system.name, this.offsetX(location.x), this.offsetY(location.y) - textOffset)
  }

  drawNebula (nebula) {
    const location = nebula.location
    const radius = nebula.radius
    const canvas = this.layers.nebula
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    // TODO: fix mirroring of Nebula position
    ctx.arc(this.offsetX(-location.x), this.offsetY(location.y), radius, 0, 2 * Math.PI, false)
    ctx.globalAlpha = 0.25
    ctx.fillStyle = 'magenta'
    ctx.fill()
  }

  drawHyperlane (src, dst) {
    const ctx = this.layers.hyperlane.getContext('2d')
    ctx.strokeStyle = 'cyan'
    ctx.lineWidth = 0.75
    ctx.beginPath()
    ctx.moveTo(this.offsetX(src.x), this.offsetY(src.y))
    ctx.lineTo(this.offsetX(dst.x), this.offsetY(dst.y))
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
