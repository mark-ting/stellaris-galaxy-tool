/**
 * GeometryLib.js
 *
 * 2D Cartesian coordinate library.
 */

export class Point {
  constructor (x, y) {
    this.x = x
    this.y = y
  }

  equals (pt) {
    return (this.x === pt.x && this.y === pt.y)
  }

  distanceTo (pt) {
    return Math.sqrt((this.x - pt.x) * (this.x - pt.x) + (this.y - pt.y) * (this.y - pt.y))
  }
}

export class Rectangle {
  constructor (tl, width, height) {
    this.tl = tl
    this.w = width
    this.h = height
  }

  equals (rect) {
    return (
      (this.tl.equals(rect.tl)) &&
      (this.w === rect.w) &&
      (this.h = rect.h)
    )
  }

  intersects (rect) {
    return !(
      (this.tl.x + this.w < rect.tl.x) ||
      (this.tl.x > rect.tl.x + rect.w) ||
      (this.tl.y - this.h > rect.tl.y) ||
      (this.tl.y < rect.tl.y - rect.h)
    )
  }

  contains (pt) {
    return (
      (pt.x >= this.tl.x) &&
      (pt.x <= this.tl.x + this.w) &&
      (pt.y <= this.tl.y) &&
      (pt.y >= this.tl.y - this.h)
    )
  }
}
