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

  equalTo (pt) {
    return (this.x === pt.x && this.y === pt.y)
  }

  distanceTo (pt) {
    return Math.sqrt((this.x - pt.x) * (this.x - pt.x) + (this.y - pt.y) * (this.y - pt.y))
  }

  static equals (a, b) {
    return (a.x === b.x && a.y === b.y)
  }

  static distance (a, b) {
    return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))
  }
}

export class Rectangle {
  /**
   * Creates a new Rectangle.
   * @param {any} tl Top-left corner of Rectangle.
   * @param {any} width Width of Rectangle.
   * @param {any} height Height of Rectangle.
   */
  constructor (tl, width, height) {
    this.tl = tl
    this.w = width
    this.h = height
  }

  equals (rect) {
    return (
      (Point.equals(this.tl, rect.tl)) &&
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
