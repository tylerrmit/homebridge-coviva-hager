import {Coviva_Node, CovivaDeviceState} from '../../CovivaAPI';
import {LogLevel, CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue} from 'homebridge';
import {inspect} from 'util';
import {CovivaCharacteristic} from './base';
import {BaseAccessory} from '../BaseAccessory';

export type TargetPositionCharacteristicData = { targetposition: string }
type DeviceWithTargetPositionCharacteristic = Coviva_Node<CovivaDeviceState & TargetPositionCharacteristicData>

export class TargetPositionCharacteristic extends CovivaCharacteristic {
  public static Title = 'Characteristic.TargetPosition'

  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
  public static HomekitCharacteristic(accessory: BaseAccessory) {
    accessory.log.log(
      LogLevel.INFO,
      '[%s] TargetPosition.HomekitCharacteristic() returning [%d]',
      accessory.name,
      accessory.platform.Characteristic.TargetPosition
    );

    return accessory.platform.Characteristic.TargetPosition;
  }
  /* eslint-enable @typescript-eslint/explicit-module-boundary-types */

  public static DEFAULT_VALUE = 100;

  public static isSupportedByAccessory(accessory: BaseAccessory): boolean {
    const configData = accessory.deviceConfig.data;

    accessory.log.log(
      LogLevel.INFO,
      '[%s] TargetPosition.isSupportedByAccessory() returning [%s]',
      accessory.name,
      String(configData.targetposition !== undefined)
    );

    return configData.targetposition !== undefined;
  }

  public getRemoteValue(callback: CharacteristicGetCallback): void {
    this.info('TargetPosition.getRemoteValue()');
    this.accessory.getDeviceState<TargetPositionCharacteristicData>().then((data) => {
      this.info('TargetPosition.getRemoteValue() [GET] %s', data?.targetposition);
      this.updateValue(data, callback);
    }).catch(this.accessory.handleError('GET', callback));
  }

  public setRemoteValue(homekitValue: CharacteristicValue, callback: CharacteristicSetCallback): void {
    // Set device state in Coviva API
    const value = homekitValue as number;

    this.info('TargetPosition.setRemoteValue() [%d]', value);

    this.accessory.setDeviceState('targetPositionSet', {value}, {targetposition: homekitValue}).then(() => {
      this.info('TargetPosition.setRemoteValue() [SET] %s', value);
      callback();
    }).catch(this.accessory.handleError('SET', callback));
  }

  updateValue(data: DeviceWithTargetPositionCharacteristic['data'] | undefined, callback?: CharacteristicGetCallback): void {
    if (typeof data?.targetposition !== 'undefined') {
      this.info('TargetPosition.updateValue() Setting Current Position to %d', data?.targetposition);
      this.accessory.setCharacteristic(this.homekitCharacteristic, data?.targetposition, !callback);
      callback && callback(null, data?.targetposition);
      return;
    }

    this.error('Tried to set target position but failed to parse data.\n %s', inspect(data));
  }
}
