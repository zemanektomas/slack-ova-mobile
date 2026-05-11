const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// CSV soubory v assets/seed/ načítáme jako static assety přes require()
config.resolver.assetExts.push('csv');

module.exports = config;
