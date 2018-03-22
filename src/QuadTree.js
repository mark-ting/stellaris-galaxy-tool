/**
 * QuadTree.js
 *
 * QuadTree implementation intended to be used with HTML canvas.
 * QuadTree stores Datapoint objects which contain a string data payload and an associated Point location.
 *
 * Based on:
 * https://gamedevelopment.tutsplus.com/tutorials/quick-tip-use-quadtrees-to-detect-likely-collisions-in-2d-space--gamedev-374
 */

import { Point, Rectangle } from './GeometryLib'

export class Datapoint {
  constructor (data, loc) {
    this.data = data
    this.location = loc
  }
}

export class QuadTree {
  constructor (bounds, capacity = 5) {
    this.bounds = bounds
    this.capacity = capacity
    this.current = 0
    this.datapoints = []
    this.isParent = false
    this.children = {
      tl: null,
      tr: null,
      bl: null,
      br: null
    }
  }

  /**
   * Inserts a Datapoint into the QuadTree.
   * Returns if Datapoint was successfully inserted.
   * @param {Datapoint} dataPt
   * @returns {boolean}
   * @memberof QuadTree
   */
  insert (dataPt) {
    if (!this.bounds.contains(dataPt.location)) {
      return false
    }

    if (this.current < this.capacity) {
      this.datapoints.push(dataPt)
      this.current++
    } else {
      if (!this.isParent) {
        this.subdivide()
      }
      for (const quad in this.children) {
        const child = this.children[quad]
        if (child.insert(dataPt)) {
          break
        }
      }
    }
    return true
  }

  /**
   * Sets current node as parent and creates 4 child quadrants, each a QuadTree instance.
   * @memberof QuadTree
   */
  subdivide () {
    this.isParent = true

    const tlX = this.bounds.tl.x
    const tlY = this.bounds.tl.y
    const halfW = this.bounds.w / 2
    const halfH = this.bounds.h / 2

    const tlChildTl = this.bounds.tl
    const trChildTl = new Point(tlX + halfW, tlY)
    const blChildTl = new Point(tlX, tlY - halfH)
    const brChildTl = new Point(tlX + halfW, tlY - halfH)

    const tlChildBounds = new Rectangle(tlChildTl, halfW, halfH)
    const trChildBounds = new Rectangle(trChildTl, halfW, halfH)
    const blChildBounds = new Rectangle(blChildTl, halfW, halfH)
    const brChildBounds = new Rectangle(brChildTl, halfW, halfH)

    this.children.tl = new QuadTree(tlChildBounds)
    this.children.tr = new QuadTree(trChildBounds)
    this.children.bl = new QuadTree(blChildBounds)
    this.children.br = new QuadTree(brChildBounds)
  }

  /**
   * Returns Datapoints in a specified search location.
   * @param {(Point|Rectangle)} target
   * @returns {Datapoint[]} Datapoints in/on target.
   * @memberof QuadTree
   */
  query (target) {
    const rect = (target instanceof Rectangle) ? target : new Rectangle(new Point(target.x, target.y), 0, 0)

    let results = []
    if (!this.bounds.intersects(rect)) {
      return results
    }

    for (let i = 0; i < this.datapoints.length; i++) {
      const dataPt = this.datapoints[i]
      if (rect.contains(dataPt.location)) {
        results.push(dataPt)
      }
    }

    if (this.isParent) {
      for (const quad in this.children) {
        const child = this.children[quad]
        results = results.concat(child.query(rect))
      }
    }

    return results
  }

  /**
   * Returns Datapoints within a specified distance of a location.
   * @param {Point} location
   * @param {number} radius
   * @returns {Datapoint[]} Datapoints within radius of location.
   * @memberof QuadTree
   */
  radialQuery (location, radius, criteria) {
    const searchPt = new Point(location.x - radius, location.y + radius)
    const searchRect = new Rectangle(searchPt, 2 * radius, 2 * radius)

    const candidates = this.query(searchRect)
    const results = candidates.filter(candidate => location.distanceTo(candidate.location) <= radius)
    return results
  }

  /**
   * Clears and resets QuadTree.
   * @memberof QuadTree
   */
  clear () {
    if (this.current > 0) {
      this.current = 0
      this.datapoints = []
      this.isParent = false
      this.children = {
        tl: null,
        tr: null,
        bl: null,
        br: null
      }
    }
  }

  /**
   * Returns all datapoints stored in QuadTree.
   * @returns {Datapoint[]}
   * @memberof QuadTree
   */
  dump () {
    let datapoints = this.datapoints
    if (this.isParent) {
      for (const quad in this.children) {
        const child = this.children[quad]
        datapoints = datapoints.concat(child.dump())
      }
    }
    return datapoints
  }

  /**
   * Removes and re-inserts all points in QuadTree.
   * @memberof QuadTree
   */
  rebuild () {
    const datapoints = this.dump()
    this.clear()
    for (let i = 0; i < datapoints.length; i++) {
      const datapoint = datapoints[i]
      this.insert(datapoint)
    }
  }

  /**
   * Resizes QuadTree (per-node capacity) and rebuilds.
   * @param {number} capacity
   * @memberof QuadTree
   */
  repartition (capacity) {
    this.capacity = capacity
    this.rebuild()
  }
}
