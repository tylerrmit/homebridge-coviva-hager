import {API, Characteristic, DynamicPlatformPlugin, Logger, PlatformAccessory, Service} from 'homebridge';
import {PLATFORM_NAME, PLUGIN_NAME} from './settings';
import {Coviva_Node, CovivaAPI} from './CovivaAPI';

import {
  BaseAccessory,
  DimmableLightAccessory,
  LightAccessory
} from './accessories';

import {CovivaHagerConfig} from './config';

export type HomebridgeAccessory<DeviceConfig extends Coviva_Node> =
    PlatformAccessory
    & { controller?: BaseAccessory<DeviceConfig> }


/*
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class CovivaHagerPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // Track configured accessories -- including ones cached and previously discovered -- by UUID
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly configured_accessories: Map<string, HomebridgeAccessory<any>> = new Map();

  // Intervals for polling and pinging the Coviva API, plus a record of our Coviva ID
  private readonly pollingInterval: number = 180;
  private readonly pingInterval:    number = 60;
  public  readonly covivaId:        string = '';

  // Object that will handle commands to Coviva API
  public readonly covivaAPI!: CovivaAPI;

  // Track accessories that we tried and failed to initialise with HomeKit,
  // by profile id (Coviva accessory type)
  private failedToInitAccessories: Map<number, string[]> = new Map();

  constructor(
    public readonly log: Logger,
    public readonly config: CovivaHagerConfig,
    public readonly api: API,
  ) {
    // Validate config.json Homebridge options for this platform
    if (!config || !config.options) {
      this.log.info('No options found in configuration file for Coviva, disabling plugin.');
      return;
    }
    const options = config.options;

    if (options.username === undefined || options.password === undefined || options.covivaId === undefined) {
      this.log.error('Missing required config parameter (username or password or covivaId)');
      return;
    }

    // Set default intervals
    if (typeof config.options.pollingInterval === 'undefined') {
      this.pollingInterval = 180;
    }
    else {
      this.pollingInterval = config.options.pollingInterval;
    }

    if (typeof config.options.pingInterval === 'undefined') {
      this.pingInterval = 60;
    }
    else {
      this.pingInterval = config.options.pingInterval;
    }

    this.covivaId = options.covivaId;

    // Create Coviva API instance to handle communication with Coviva
    this.covivaAPI = new CovivaAPI(
      options.username,
      options.password,
      options.covivaId,
      this.log,
      this // Passing a reference to this object for the purposes of passing incoming device update signals to HomeKit
    );

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      try {
        // Open a connection to the Coviva API
        await this.covivaAPI.login();

        // Discover/register new accessories, and get current state information
        await this.discoverDevices();

        // Set up periodic polling and pings (ONCE)

        // Set up a regular "polling" for device state via "GET:all" every X seconds
        if (this.pollingInterval >= 60) {
          this.log.info('Setting polling interval: ' + this.pollingInterval);

          setTimeout(() => {
            try {
              this.covivaAPI.sendMessage('GET:all');
            }
            catch (e) {
              this.log.warn('Unable to poll device status');
            }
          }, this.pollingInterval * 1000);
        }
        else if (this.pollingInterval == 0) {
          this.log.info('Polling interval is zero, not polling for device status');
        }
        else {
          this.log.info('Polling Interval [' + this.pollingInterval + '] is less than the minimum of 60, not polling for device status');
        }

        // Set up a regular "ping" message to keep the WebSocket connection alive
        // iOS app seemed to "ping" every 5 seconds, so if it's set to any lower than
        // that (e.g. 0) then we will not ping at all, to avoid causing a nuissance.
        // Recommended interval 60 seconds, you could make it much longer, probaly
        if (this.pingInterval >= 5) {
          setInterval(() => {
            try {
              this.covivaAPI.sendMessage('ping');
            }
            catch (e) {
              this.log.warn('Failed to send ping');
            }
          }, this.pingInterval * 1000);
        }
        else if (this.pingInterval == 0) {
          this.log.info('Ping Interval is zero, not sending keepalive pings');
        }
        else {
          this.log.info('Ping Interval [' + this.pingInterval + '] is less than the minimum of 5, not sending keepalive pings');
        }

        
      }
      catch (e) {
        this.log.error(e.message);
        this.log.debug(e);
      }
    });
  }

  /*
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  public configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.configured_accessories.set(accessory.UUID, accessory);
  }

  public removeAccessory(accessory: PlatformAccessory): void {
    this.log.info('Removing accessory:', accessory.displayName);
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

    this.configured_accessories.delete(accessory.UUID);
  }

  // Called from device classes
  public registerPlatformAccessory(accessory: PlatformAccessory): void {
    this.log.debug('Register Platform Accessory (%s)', accessory.displayName);
    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

    this.configured_accessories.set(accessory.UUID, accessory);
  }

  // Send a signal to HomeKit that it needs to update its records of the latest state
  // for a list of devices.  E.g. someone flicked the switch external to HomeKit.
  public async refreshDeviceStates(devices?: Coviva_Node[]): Promise<void> {
    devices = devices || this.filterDeviceList(await this.covivaAPI.getAllDeviceStates());
    if (!devices) {
      return;
    }

    // Refresh device states
    for (const device of devices) {
      // Only do this for supported devices that would have been registered with HomeKit
      if (device.profile == 10 || device.profile == 15) {
        const uuid = this.api.hap.uuid.generate(this.covivaAPI.covivaId?.toUpperCase() + device.id.toString());

        const homebridgeAccessory = this.configured_accessories.get(uuid);
        if (homebridgeAccessory) {
          homebridgeAccessory.controller?.updateAccessory(device); // Update Homekit from Coviva_Node.data parsed state
        }
        else if (!this.failedToInitAccessories.get(device.profile)?.includes(uuid)) {
          this.log.error('Could not find Homebridge device with UUID (%s) for Coviva device (%s)', uuid, device.name);
        }
      }
    }
  }

  // Add a new accessory of the appropriate type for its profile ID
  private addAccessory(device: Coviva_Node): void {
    const uuid = this.api.hap.uuid.generate(this.covivaAPI.covivaId?.toUpperCase() + device.id.toString());

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const homebridgeAccessory = this.configured_accessories.get(uuid)!;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    // Construct new accessory
    /* eslint-disable @typescript-eslint/no-explicit-any */
    switch (device.profile) {
      case 10:
        new LightAccessory(this, homebridgeAccessory, device as any);
        break;

      case 15:
        new DimmableLightAccessory(this, homebridgeAccessory, device as any);
        break;

      default:
        if (!this.failedToInitAccessories.get(device.profile)) {
          this.log.warn('Could not init class for device type [%d]', device.profile);
          this.failedToInitAccessories.set(device.profile, []);
        }
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        this.failedToInitAccessories.set(device.profile, [uuid, ...this.failedToInitAccessories.get(device.profile)!]);
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
        break;
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  // Filter a device list down to only the supported types
  private filterDeviceList(devices: Coviva_Node[]): Coviva_Node[] {
    if(!devices) {
      return [];
    }
    return devices
      .filter(d => (d.profile == 10 || d.profile == 15));
     
    return devices; 
  }

  // Ask the Coviva API to discover devices
  async discoverDevices(): Promise<void> {
    let devices = await this.covivaAPI.discoverDevices() || [];

    // Only deal with supported device types
    devices = this.filterDeviceList(devices);

    const cachedDeviceIds = [...this.configured_accessories.keys()];
    const availableDeviceIds = devices.map(d => this.generateUUID(this.covivaId.toUpperCase() + d.id));

    // Check for any accessories that were previously registered with HomeKit that seem
    // to have disappeared
    for (const cachedDeviceId of cachedDeviceIds) {
      if (!availableDeviceIds.includes(cachedDeviceId)) {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        const device = this.configured_accessories.get(cachedDeviceId)!;
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
        this.log.warn('Device: %s - is no longer available and will be removed', device.displayName);
        this.removeAccessory(device);
      }
      else {
        this.log.debug('Device: %s in configured_accessories was found OK', cachedDeviceId);
      }
    }

    // Register every supported device that was not already registered
    for (const device of devices) {
      this.addAccessory(device);
    }

    // Send HomeKit the latest device state information for all supported devices
    await this.refreshDeviceStates(devices);
  }

  public get platformAccessory(): typeof PlatformAccessory {
    return this.api.platformAccessory;
  }

  public get generateUUID(): (BinaryLike) => string {
    return this.api.hap.uuid.generate;
  }
}
