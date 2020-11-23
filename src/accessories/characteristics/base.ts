import {BaseAccessory, CharacteristicConstructor} from '../BaseAccessory';
import {LogLevel} from 'homebridge';
import {Characteristic, CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue} from 'homebridge';

export abstract class CovivaCharacteristic<Accessory extends BaseAccessory = BaseAccessory> {
  public static Title: string;
  public static HomekitCharacteristic: (accessory: BaseAccessory) => CharacteristicConstructor;

  public static isSupportedByAccessory<Accessory extends BaseAccessory>(accessory: Accessory): boolean {
    accessory.log.error('Method `isSupportedByAccessory must be overwritten by Characteristic, missing for %s', this.Title);
    return false;
  }

  public setProps(characteristic?: Characteristic): Characteristic | undefined {
    return characteristic;
  }

  constructor(protected accessory: Accessory) {
    this.accessory = accessory;
    if (!this.staticInstance.isSupportedByAccessory(accessory)) {
      this.disable();
      return;
    }

    this.enable();
  }

  private get staticInstance(): typeof CovivaCharacteristic {
    return <typeof CovivaCharacteristic>this.constructor;
  }

  public get title(): string {
    return this.staticInstance.Title;
  }

  public get homekitCharacteristic(): CharacteristicConstructor {
    return this.staticInstance.HomekitCharacteristic(this.accessory);
  }

  private log(logLevel: LogLevel, message: string, ...args: unknown[]): void {
    this.accessory.log.log(logLevel, `[%s] %s - ${message}`, this.accessory.name, this.title, ...args);
  }

  protected debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  protected info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  protected warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  protected error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  public abstract getRemoteValue(callback: CharacteristicGetCallback): void;

  public abstract setRemoteValue(homekitValue: CharacteristicValue, callback: CharacteristicSetCallback): void;

  public abstract updateValue(data?: Accessory['deviceConfig']['data'], callback?: CharacteristicGetCallback): void;


  private enable(): void {
    this.debug('Enabled');
    const char = this.setProps(this.accessory.service?.getCharacteristic(this.homekitCharacteristic));

    if (char) {
      char.on('get', this.getRemoteValue.bind(this))
        .on('set', this.setRemoteValue.bind(this));
    }

    this.accessory.addUpdateCallback(this.homekitCharacteristic, this.updateValue.bind(this));
  }

  private disable(): void {
    this.debug('Characteristic not supported');
        this.accessory.service?.removeCharacteristic(new this.homekitCharacteristic);
  }
}
