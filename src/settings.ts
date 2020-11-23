// eslint-disable-next-line
const packageJson = require('../package.json');

/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME: string = packageJson.displayName;

/**
 * This must match the name of your plugin as defined the package.json
 */
export const PLUGIN_NAME: string = packageJson.name;

/**
 * The version the package is currently on as defined in package.json
 */
export const VERSION: string = packageJson.version;

/**
 * The standard timeout for Coviva device requests.
 */
export const COVIVA_DEVICE_TIMEOUT = 60;
