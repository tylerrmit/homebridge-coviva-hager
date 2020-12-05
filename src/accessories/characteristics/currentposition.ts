import {Coviva_Node, CovivaDeviceState} from '../../CovivaAPI';
import {CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue} from 'homebridge';
import {inspect} from 'util';
import {CovivaCharacteristic} from './base';
import {BaseAccessory} from '../BaseAccessory';

export type CurrentPositionCharacteristicData = { currentposition: string }
type DeviceWithCurrentPositionCharacteristic = Coviva_Node<CovivaDeviceState & CurrentPositionCharacteristicData>

export class CurrentPositionCharacteristic extends CovivaCharacteristic {
  public static Title = 'Characteristic.CurrentPosition'

  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
  public static HomekitCharacteristic(accessory: BaseAccessory) {
    return accessory.platform.Characteristic.CurrentPosition;
  }
  /* eslint-enable @typescript-eslint/explicit-module-boundary-types */

  public static DEFAULT_VALUE = 100;

  public static isSupportedByAccessory(accessory: BaseAccessory): boolean {
    const configData = accessory.deviceConfig.data;
    return configData.currentposition !== undefined;
  }

  public getRemoteValue(callback: CharacteristicGetCallback): void {
    this.debug('getRemoteValue for CurrentPosition');
    this.accessory.getDeviceState<CurrentPositionCharacteristicData>().then((data) => {
      this.debug('[GET] %s', data?.currentposition);
      this.updateValue(data, callback);
    }).catch(this.accessory.handleError('GET', callback));
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  public setRemoteValue(homekitValue: CharacteristicValue, callback: CharacteristicSetCallback): void {
    // This attribute cannot be set from HomeKit
    return;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  updateValue(data: DeviceWithCurrentPositionCharacteristic['data'] | undefined, callback?: CharacteristicGetCallback): void {
    if (typeof data?.currentposition !== 'undefined') {
      this.debug('Setting Current Position to %d', data?.currentposition);
      this.accessory.setCharacteristic(this.homekitCharacteristic, data?.currentposition, !callback);
      callback && callback(null, data?.currentposition);
      return;
    }

    this.error('Tried to set brightness but failed to parse data.\n %s', inspect(data));
  }
}
