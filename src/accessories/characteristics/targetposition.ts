import {Coviva_Node, CovivaDeviceState} from '../../CovivaAPI';
import {CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue} from 'homebridge';
import {inspect} from 'util';
import {CovivaCharacteristic} from './base';
import {BaseAccessory} from '../BaseAccessory';

export type TargetPositionCharacteristicData = { targetposition: string }
type DeviceWithTargetPositionCharacteristic = Coviva_Node<CovivaDeviceState & TargetPositionCharacteristicData>

export class TargetPositionCharacteristic extends CovivaCharacteristic {
  public static Title = 'Characteristic.TargetPosition'

  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
  public static HomekitCharacteristic(accessory: BaseAccessory) {
    return accessory.platform.Characteristic.TargetPosition;
  }
  /* eslint-enable @typescript-eslint/explicit-module-boundary-types */

  public static DEFAULT_VALUE = 100;

  public static isSupportedByAccessory(accessory: BaseAccessory): boolean {
    const configData = accessory.deviceConfig.data;
    return configData.targetposition !== undefined;
  }

  public getRemoteValue(callback: CharacteristicGetCallback): void {
    this.debug('getRemoteValue for TargetPosition');
    this.accessory.getDeviceState<TargetPositionCharacteristicData>().then((data) => {
      this.debug('[GET] %s', data?.targetposition);
      this.updateValue(data, callback);
    }).catch(this.accessory.handleError('GET', callback));
  }

  public setRemoteValue(homekitValue: CharacteristicValue, callback: CharacteristicSetCallback): void {
    // Set device state in Coviva API
    const value = homekitValue as number;

    this.accessory.setDeviceState('targetPositionSet', {value}, {targetposition: homekitValue}).then(() => {
      this.debug('[SET] %s', value);
      callback();
    }).catch(this.accessory.handleError('SET', callback));
  }

  updateValue(data: DeviceWithTargetPositionCharacteristic['data'] | undefined, callback?: CharacteristicGetCallback): void {
    if (typeof data?.targetposition !== 'undefined') {
      this.debug('Setting Current Position to %d', data?.targetposition);
      this.accessory.setCharacteristic(this.homekitCharacteristic, data?.targetposition, !callback);
      callback && callback(null, data?.targetposition);
      return;
    }

    this.error('Tried to set brightness but failed to parse data.\n %s', inspect(data));
  }
}
