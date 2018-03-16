# Changelog

## [1.0.1] - 2018-03-16
Improved extended System attribute support. Nebula support.

### Added
* Support for variable System positions/ranges from imported files.
  - `position = { x = { min = val max = val} y = { min = ymin max = ymax }` will now import/export correctly.
  - If a variable position is specified, the render position on the canvas is given as the average value of the range (e.g. `x = { min = -10 max = 10 }` will render at `x = 0`), but the range specified will be preserved in the actual files
* Import/export support for System `initializer` and `spawn_weight` values.
* Support (import, export, render) for Nebulas.

## 1.0.0 - 2018-03-14
Initial release. Intended for modders to edit hyperlanes in an existing map.
### Release Notes
* Holding <kbd>CTRL</kbd> creates hyperlanes from the active system to any clicked destination systems.
* Holding <kbd>SHIFT</kbd> creates hyperlanes from the active system to a clicked destination system and sets the destination as the new active system. This allows creation of hyperlane "chains".
* Radial hyperlane generation/removal considers all non-locked systems that are not already connected to the active system.
  - Radial distance is based on Cartesian distance.
* Map file import takes in Clausewitz `.txt` files.
* Map file export results in Clausewitz `.txt` files.
  - There are tab (`\t`) characters in front of each attribute apart from the base `static_galaxy_scenario` declaration and its opening and closing braces.
  - The end-of-line delimiter is `CRLF` (`\r\n`).

### Known Issues
* Linked systems may not be in sorted numerical (System ID) order.
* Importing a map with variable system positions (e.g. `position = { x = { min = val max = val} y = { min = ymin max = ymax }`) may soft-lock in an invalid state
  - If this occurs, clearing browser `localStorage` and refreshing will reset the app to its default state.
* It is possible to input illegal values into the Settings window.
* It is possible to import invalid settings from a static map file.

[Unreleased]: https://github.com/mat3049/stellaris-galaxy-tool/compare/1.0.1...HEAD
[1.0.1]: hhttps://github.com/mat3049/stellaris-galaxy-tool/compare/1.0.0...1.0.1