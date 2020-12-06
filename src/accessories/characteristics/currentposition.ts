import {Coviva_Node, CovivaDeviceState} from '../../CovivaAPI';
import {LogLevel, CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue} from 'homebridge';
import {inspect} from 'util';
import {CovivaCharacteristic} from './base';
import {BaseAccessory} from '../BaseAccessory';

export type CurrentPositionCharacteristicData = { currentposition: string }
type DeviceWithCurrentPositionCharacteristic = Coviva_Node<CovivaDeviceState & CurrentPositionCharacteristicData>

export class CurrentPositionCharacteristic extends CovivaCharacteristic {
  public static Title = 'Characteristic.CurrentPosition'

  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
  public static HomekitCharacteristic(accessory: BaseAccessory) {
    accessory.log.log(
      LogLevel.INFO,
      '[%s] CurrentPosition.HomekitCharacteristic() returning [%d]',
      accessory.name,
      accessory.platform.Characteristic.CurrentPosition
    );

    return accessory.platform.Characteristic.CurrentPosition;
  }
  /* eslint-enable @typescript-eslint/explicit-module-boundary-types */

  public static DEFAULT_VALUE = 100;

  public static isSupportedByAccessory(accessory: BaseAccessory): boolean {
    const configData = accessory.deviceConfig.data;
    
    accessory.log.log(
      LogLevel.INFO,
      '[%s] CurrentPosition.isSupportedByAccessory() returning [%s]',
      accessory.name,
      String(configData.currentposition !== undefined)
    );

    return configData.currentposition !== undefined;
  }

  public getRemoteValue(callback: CharacteristicGetCallback): void {
    this.debug('CurrentPosition.getRemoteValue()');
    this.accessory.getDeviceState<CurrentPositionCharacteristicData>().then((data) => {
      this.debug('CurrentPosition.getRemoteValue() [GET] %s', data?.currentposition);
      this.updateValue(data, callback);
    }).catch(this.accessory.handleError('GET', callback));
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  public setRemoteValue(homekitValue: CharacteristicValue, callback: CharacteristicSetCallback): void {
    // Set device state in Coviva API
    const value = homekitValue as number;

    this.debug('CurrentPosition.setRemoteValue() [%d]', value);

    // This attribute cannot be set from HomeKit
    return;
/*
    this.accessory.setDeviceState('currentPositionSet', {value}, {targetposition: homekitValue}).then(() => {
      this.debug('CurrentPosition.setRemoteValue() [SET] %s', value);
      callback();
    }).catch(this.accessory.handleError('SET', callback));
*/
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  updateValue(data: DeviceWithCurrentPositionCharacteristic['data'] | undefined, callback?: CharacteristicGetCallback): void {
    if (typeof data?.currentposition !== 'undefined') {
      this.debug('CurrentPosition.updateValue() Setting Current Position to %d', data?.currentposition);
      this.accessory.setCharacteristic(this.homekitCharacteristic, data?.currentposition, !callback);
      callback && callback(null, data?.currentposition);
      return;
    }

    this.error('Tried to set current position but failed to parse data.\n %s', inspect(data));
  }
}
