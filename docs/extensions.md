# Extensions

While Selenix Does support MV3 and MV2 Extensions, electron does not currently have every single chrome apis so some of your extensions may not work properly or error out saying theres some features missing and to update your browser.

# Installing an extension

To install an extension, you will need to extract the `crx` file of the extension and put the extracted folder to `extensions` directory.

The `extensions` directory paths:
- On Linux and macOS: `~/.selenix/extensions`
- On Windows: `%USERPROFILE%/.selenix/extensions`
