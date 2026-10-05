const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
// Reuse the web's platform-independent finance rules, with mobile dependencies.
config.watchFolders = [path.resolve(__dirname, "../..")];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];
config.resolver.disableHierarchicalLookup = true;
module.exports = config;
