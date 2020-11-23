import {Coviva_Node, CovivaDeviceState} from '../../CovivaAPI';
import {CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue} from 'homebridge';
import {inspect} from 'util';
import {CovivaCharacteristic} from './base';
import {BaseAccessory} from '../BaseAccessory';

export type BrightnessCharacteristicData = { brightness: string }
type DeviceWithBrightnessCharacteristic = Coviva_Node<CovivaDeviceState & BrightnessCharacteristicData>

export class BrightnessCharacteristic extends CovivaCharacteristic {
  public static Title = 'Characteristic.Brightness'

  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
  public static HomekitCharacteristic(accessory: BaseAccessory) {
    return accessory.platform.Characteristic.Brightness;
  }
  /* eslint-enable @typescript-eslint/explicit-module-boundary-types */

  public static DEFAULT_VALUE = 100;

  public static isSupportedByAccessory(accessory: BaseAccessory): boolean {
    const configData = accessory.deviceConfig.data;
    return configData.brightness !== undefined;
  }

  public getRemoteValue(callback: CharacteristicGetCallback): void {
    this.debug('getRemoteValue for brightness');
    this.accessory.getDeviceState<BrightnessCharacteristicData>().then((data) => {
      this.debug('[GET] %s', data?.brightness);
      this.updateValue(data, callback);
    }).catch(this.accessory.handleError('GET', callback));
  }

  public setRemoteValue(homekitValue: CharacteristicValue, callback: CharacteristicSetCallback): void {
    // Set device state in Coviva API
    const value = homekitValue as number;

    this.accessory.setDeviceState('brightnessSet', {value}, {brightness: homekitValue}).then(() => {
      this.debug('[SET] %s', value);
      callback();
    }).catch(this.accessory.handleError('SET', callback));
  }

  updateValue(data: DeviceWithBrightnessCharacteristic['data'] | undefined, callback?: CharacteristicGetCallback): void {
    if (typeof data?.brightness !== 'undefined') {
      this.debug('Setting brightness to %d', data?.brightness);
      this.accessory.setCharacteristic(this.homekitCharacteristic, data?.brightness, !callback);
      callback && callback(null, data?.brightness);
      return;
    }

    this.error('Tried to set brightness but failed to parse data.\n %s', inspect(data));
  }
}
