import {HomebridgeAccessory, CovivaHagerPlatform} from '../platform';
import {
  Categories,
  Characteristic,
  CharacteristicGetCallback,
  CharacteristicValue,
  Logger, LogLevel,
  Nullable,
  Service,
  WithUUID,
} from 'homebridge';
import debounce from 'lodash.debounce';
import {CovivaApiMethod, CovivaApiPayload, Coviva_Node, CovivaDeviceState} from '../CovivaAPI';
import {PLUGIN_NAME, COVIVA_DEVICE_TIMEOUT} from '../settings';
import {inspect} from 'util';
import {DebouncedPromise} from '../helpers/DebouncedPromise';
import {RatelimitError} from '../errors';

export type CharacteristicConstructor = WithUUID<{
  new(): Characteristic;
}>;

type UpdateCallback<DeviceConfig extends Coviva_Node> = (data?: DeviceConfig['data'], callback?: CharacteristicGetCallback) => void

class Cache<DeviceConfig extends Coviva_Node = Coviva_Node> {
  private value?: DeviceConfig['data'];
  private validUntil = 0;

  public get valid(): boolean {
    return this.validUntil > Cache.getCurrentEpoch() && this.value !== undefined;
  }

  public set(data: DeviceConfig['data']): void {
    this.validUntil = Cache.getCurrentEpoch() + COVIVA_DEVICE_TIMEOUT + 5;
    this.value = data;
  }

  public renew() {
    const data = this.get(true);
    if(data) {
      this.set(data);
    }
  }

  public merge(data: DeviceConfig['data']): void {
    this.value = {...this.value, ...data};
  }

  /**
    *
    * @param always - return the cache even if cache is not valid
    */
  public get(always = false): Nullable<DeviceConfig['data']> {
    if(!always && !this.valid) {
      return null;
    }

    return this.value || null;
  }

  private static getCurrentEpoch(): number {
    return Math.ceil((new Date()).getTime() / 1000);
  }
}

type ErrorCallback = (error: Error) => void;

export abstract class BaseAccessory<DeviceConfig extends Coviva_Node = Coviva_Node> {
  public readonly log: Logger;
  private readonly cache = new Cache<DeviceConfig>();
  private readonly serviceType: WithUUID<typeof Service>;
  public readonly service?: Service;
  public readonly deviceId: string;
  private updateCallbackList: Map<CharacteristicConstructor, Nullable<UpdateCallback<DeviceConfig>>> = new Map();

  constructor(
    public readonly platform: CovivaHagerPlatform,
    public readonly homebridgeAccessory: HomebridgeAccessory<DeviceConfig>,
    public readonly deviceConfig: DeviceConfig,
    private readonly categoryType: Categories
  ) {
    this.log = platform.log;
    this.deviceId = deviceConfig.id.toString();

    this.log.debug('[%s] deviceConfig: %s', this.deviceConfig.name, inspect(this.deviceConfig));

    switch (categoryType) {
      case Categories.LIGHTBULB:
        this.serviceType = platform.Service.Lightbulb;
        break;
      case Categories.SWITCH:
        this.serviceType = platform.Service.Switch;
        break;
      case Categories.OUTLET:
        this.serviceType = platform.Service.Outlet;
        break;
      case Categories.FAN:
        this.serviceType = platform.Service.Fanv2;
        break;
      case Categories.WINDOW_COVERING:
        this.serviceType = platform.Service.WindowCovering;
        break;
      default:
        this.serviceType = platform.Service.AccessoryInformation;
    }

    // Retrieve existing or create new Bridged Accessory
    if (this.homebridgeAccessory) {
      this.homebridgeAccessory.controller = this;
      if (!this.homebridgeAccessory.context.deviceId) {
        this.homebridgeAccessory.context.deviceId = this.deviceConfig.id;
      }
      this.log.info(
        'Existing Accessory found [Name: %s] [Coviva ID: %s] [HomeBridge ID: %s]',
        this.homebridgeAccessory.displayName,
        this.homebridgeAccessory.context.deviceId,
        this.homebridgeAccessory.UUID
      );
      this.homebridgeAccessory.displayName = this.deviceConfig.name;
    }
    else {
      const uuid = this.platform.generateUUID(this.platform.covivaId.toUpperCase() + this.deviceConfig.id);

      this.homebridgeAccessory = new this.platform.platformAccessory(
        this.deviceConfig.name,
        uuid,
        categoryType
      );
      this.homebridgeAccessory.context.deviceId = this.deviceConfig.id;
      this.homebridgeAccessory.controller = this;
      this.log.info('Created new Accessory [Name: %s] [Coviva ID: %s] [HomeBridge ID: %s]',
        this.homebridgeAccessory.displayName,
        this.homebridgeAccessory.context.deviceId,
        this.homebridgeAccessory.UUID);
      this.platform.registerPlatformAccessory(this.homebridgeAccessory);
    }

    // Create service
    this.service = this.homebridgeAccessory.getService(this.serviceType);
    if (this.service) {
      this.service.setCharacteristic(platform.Characteristic.Name, this.deviceConfig.name);
    }
    else {
      this.log.debug('Creating New Service %s', this.deviceConfig.id);
      this.service = this.homebridgeAccessory.addService(this.serviceType, this.deviceConfig.name);
    }

    this.homebridgeAccessory.on('identify', this.onIdentify.bind(this));
  }

  public get name(): string {
    return this.homebridgeAccessory.displayName;
  }

  public setCharacteristic(characteristic: CharacteristicConstructor, value: Nullable<CharacteristicValue>, updateHomekit = false): void {
    updateHomekit && this.service?.getCharacteristic(characteristic).updateValue(value);
  }

  public onIdentify(): void {
    this.log.info('[IDENTIFY] %s', this.name);
  }

  public cachedValue<T>(always = false): Nullable<CovivaDeviceState & T> {
    return this.cache.get(always) as unknown as CovivaDeviceState & T;
  }

  private debouncedDeviceStateRequest = debounce(this.resolveDeviceStateRequest, 500, {maxWait: 1500})
  private debouncedDeviceStateRequestPromise?: DebouncedPromise<CovivaDeviceState & DeviceConfig['data']>
  public async resolveDeviceStateRequest(): Promise<void> {
    const promise = this.debouncedDeviceStateRequestPromise;
    if(!promise) {
      this.error('Could not find base accessory promise.');
      return;
    }
    this.debug('Unsetting debouncedDeviceStateRequestPromise');
    this.debouncedDeviceStateRequestPromise = undefined;
      
    const cached = this.cache.get();
    if(cached !== null) {
      this.debug('Resolving resolveDeviceStateRequest from cache');
      return promise.resolve(cached);
    }

    this.platform.covivaAPI.getDeviceState(this.deviceId)
      .then((data) => {
        if(data) {
          this.debug('Set device state request cache');
          this.cache.set(data);
        }
        this.debug('Resolving resolveDeviceStateRequest from remote');
        promise.resolve(data);
      })
      .catch((error) => {
        if(error instanceof RatelimitError) {
          this.debug('Renewing cache due to RateLimitError');
          const data = this.cache.get(true);
          if(data) {
            this.cache.renew();
            return promise.resolve(data);
          }
        }
        promise.reject(error);
      })
    ;
  }

  public async getDeviceState<T>(): Promise<CovivaDeviceState & T | undefined> {
    this.debug('Requesting device state');
    if(!this.debouncedDeviceStateRequestPromise) {
      this.debug('Creating new debounced promise');
      this.debouncedDeviceStateRequestPromise = new DebouncedPromise();
    }

    this.debug('Triggering debouncedDeviceStateRequest');
    this.debouncedDeviceStateRequest();

    return this.debouncedDeviceStateRequestPromise.promise as unknown as Promise<CovivaDeviceState & T | undefined>;
  }

  public async setDeviceState<Method extends CovivaApiMethod, T>
  (method: Method, payload: CovivaApiPayload<Method>, cache: T): Promise<void> {
    this.cache.merge(cache as unknown as CovivaDeviceState & T);

    return this.platform.covivaAPI.setDeviceState(this.deviceId, method, payload);
  }

  public updateAccessory(device: DeviceConfig): void {
    const setCharacteristic = (characteristic, value): void => {
      const char = accessoryInformationService.getCharacteristic(characteristic) ||
                accessoryInformationService.addCharacteristic(characteristic);
      if (char) {
        char.setValue(value);
      }
    };

    this.homebridgeAccessory.displayName = device.name;
    this.homebridgeAccessory._associatedHAPAccessory.displayName = device.name;
    const accessoryInformationService = (
      this.homebridgeAccessory.getService(this.platform.Service.AccessoryInformation) ||
            this.homebridgeAccessory.addService(this.platform.Service.AccessoryInformation));
    setCharacteristic(this.platform.Characteristic.Name, device.name);

    setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceConfig.id);
    setCharacteristic(this.platform.Characteristic.Manufacturer, PLUGIN_NAME);
    setCharacteristic(this.platform.Characteristic.Model, this.categoryType);

    // Update device specific state
    this.updateState(device.data);
  }

  private updateState(data: DeviceConfig['data']): void {
    this.cache.set(data);
    for (const [, callback] of this.updateCallbackList) {
      if (callback !== null) {
        callback(data);
      }
    }
  }

  public addUpdateCallback(char: CharacteristicConstructor, callback: UpdateCallback<DeviceConfig>): void {
    this.updateCallbackList.set(char, callback);
  }

  public handleError(type: 'SET' | 'GET', callback: ErrorCallback): ErrorCallback {
    return (error) => {
      this.error('[%s] %s', type, error.message);
      callback(error);
    };
  }

  private shortcutLog(logLevel: LogLevel, message: string, ...args: unknown[]): void {
    this.log.log(logLevel, `[%s] - ${message}`, this.name, ...args);
  }

  protected debug(message: string, ...args: unknown[]): void {
    this.shortcutLog(LogLevel.DEBUG, message, ...args);
  }

  protected info(message: string, ...args: unknown[]): void {
    this.shortcutLog(LogLevel.INFO, message, ...args);
  }

  protected warn(message: string, ...args: unknown[]): void {
    this.shortcutLog(LogLevel.WARN, message, ...args);
  }

  protected error(message: string, ...args: unknown[]): void {
    this.shortcutLog(LogLevel.ERROR, message, ...args);
  }
}
