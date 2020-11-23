import { API } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { CovivaHagerPlatform } from './platform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API): void => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, CovivaHagerPlatform);
}
