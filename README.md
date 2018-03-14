# Stellaris Galaxy Tool

Browser-based tool for modifying Stellaris static galaxy scenarios.

## Known Issues
* Linked systems may not be in sorted numerical (System ID) order.
* Importing a map with variable system positions (e.g. `position = { x = { min = xmin max = xmax} y = { min = ymin max = ymax}`) may soft-lock in an invalid state. If this occurs, clearing browser `localStorage` and refreshing will reset the app to its default state.
* It is possible to input illegal values into the Settings window.
* It is possible to import invalid settings from a static map file.

## License

This project is licensed under the MIT License. Please see the [LICENSE.md](LICENSE) file for more details.