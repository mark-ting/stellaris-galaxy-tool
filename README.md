# Stellaris Galaxy Tool

## Current Version: 1.0.1

Browser-based tool for editing Stellaris static galaxy scenarios.

## Changes

Please see the [CHANGELOG](CHANGELOG) for more details.

## Known Issues
* Commented-out lines (those beginning with `#`) in imported files are not ignored properly.
  - e.g. If a line is a valid system declaration, it will be treated if it were not commented out and the system will be imported.
* When in an illegal data state (errors will appear in a browser's debug console), it may not be possible to automatically recover to a functional state.
  - Clearing the browser cache (application data: `localStorage`) and refreshing will allow recovery to a normal state (though all unsaved data will be lost).
* Linked systems may not be in sorted numerical (System ID) order.
* It is possible to input illegal values into the Settings window.
* It is possible to import invalid settings from a static map file.

## License

This project is licensed under the MIT License. Please see the [LICENSE](LICENSE) for more details.