import {Coviva_Node, CovivaDeviceState} from '../../CovivaAPI';
import {LogLevel, CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue} from 'homebridge';
import {inspect} from 'util';
import {CovivaCharacteristic} from './base';
import {BaseAccessory} from '../BaseAccessory';

export type PositionStateCharacteristicData = { positionstate: string }
type DeviceWithPositionStateCharacteristic = Coviva_Node<CovivaDeviceState & PositionStateCharacteristicData>

export class PositionStateCharacteristic extends CovivaCharacteristic {
  public static Title = 'Characteristic.PositionState'

  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
  public static HomekitCharacteristic(accessory: BaseAccessory) {
    accessory.log.log(
      LogLevel.INFO,
      '[%s] PositionState.HomekitCharacteristic() returning [%d]',
      accessory.name,
      accessory.platform.Characteristic.PositionState
    );

    return accessory.platform.Characteristic.PositionState;
  }
  /* eslint-enable @typescript-eslint/explicit-module-boundary-types */

  public static DEFAULT_VALUE = 100;

  public static isSupportedByAccessory(accessory: BaseAccessory): boolean {
    const configData = accessory.deviceConfig.data;

    accessory.log.log(
      LogLevel.INFO,
      '[%s] PositionState.isSupportedByAccessory() returning [%s]',
      accessory.name,
      String(configData.positionstate !== undefined)
    );

    return configData.positionstate !== undefined;
  }

  public getRemoteValue(callback: CharacteristicGetCallback): void {
    this.info('PositionState.getRemoteValue()');
    this.accessory.getDeviceState<PositionStateCharacteristicData>().then((data) => {
      this.info('PositionState.getRemoteValue() [GET] %s', data?.positionstate);
      this.updateValue(data, callback);
    }).catch(this.accessory.handleError('GET', callback));
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  public setRemoteValue(homekitValue: CharacteristicValue, callback: CharacteristicSetCallback): void {
    // Set device state in Coviva API
    const value = homekitValue as number;

    this.info('PositionState.setRemoteValue() [%d]', value);

    // This attribute cannot be set from HomeKit
    return;
/*
    this.accessory.setDeviceState('positionStateSet', {value}, {targetposition: homekitValue}).then(() => {
      this.info('PositionState.setRemoteValue() [SET] %s', value);
      callback();
    }).catch(this.accessory.handleError('SET', callback));
*/
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  updateValue(data: DeviceWithPositionStateCharacteristic['data'] | undefined, callback?: CharacteristicGetCallback): void {
    if (typeof data?.positionstate !== 'undefined') {
      this.info('PositionState.updateValue() Setting Current Position to %d', data?.positionstate);
      this.accessory.setCharacteristic(this.homekitCharacteristic, data?.positionstate, !callback);
      callback && callback(null, data?.positionstate);
      return;
    }

    this.error('Tried to set position state but failed to parse data.\n %s', inspect(data));
  }
}
