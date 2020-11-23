import {API, Characteristic, DynamicPlatformPlugin, Logger, PlatformAccessory, Service} from 'homebridge';
import {PLATFORM_NAME, PLUGIN_NAME} from './settings';
import {Coviva_Node, CovivaAPI} from './CovivaAPI';

import {
  BaseAccessory,
  DimmerAccessory, // Not actually used, my dimmer is a LightAccessory with on/off and brightness but no color
  LightAccessory
} from './accessories';

import {CovivaHagerConfig} from './config';
import {AuthenticationError} from './errors';
import {DeviceList} from './helpers/DeviceList';

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
  private readonly pollingInterval: number = 0;
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
      this.pollingInterval = 0;
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
      this.pollingInterval,
      this.pingInterval,
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
      }
      catch (e) {
        if (e instanceof AuthenticationError) {
          this.log.error('Authentication error: %s', e.message);
        } else {
          this.log.error(e.message);
          this.log.debug(e);
        }
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
      if (device.profile == 15) {
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

    const homebridgeAccessory = this.configured_accessories.get(uuid)!;

    // Construct new accessory
    /* eslint-disable @typescript-eslint/no-explicit-any */
    switch (device.profile) {
      case 15:
        new LightAccessory(this, homebridgeAccessory, device as any);
        break;

      default:
        if (!this.failedToInitAccessories.get(device.profile)) {
          this.log.warn('Could not init class for device type [%d]', device.profile);
          this.failedToInitAccessories.set(device.profile, []);
        }
        this.failedToInitAccessories.set(device.profile, [uuid, ...this.failedToInitAccessories.get(device.profile)!]);
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
      .filter(d => (d.profile == 15));
     
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
        const device = this.configured_accessories.get(cachedDeviceId)!;
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
