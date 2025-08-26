// Load the electron-chrome-extensions preload script. This ensures that
// the `chrome` namespace is available in renderer processes for MV3
// extensions. The previous electron-extensions preload has been
// replaced.
require('electron-chrome-extensions/preload');