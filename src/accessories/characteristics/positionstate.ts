import {Coviva_Node, CovivaDeviceState} from '../../CovivaAPI';
import {CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue} from 'homebridge';
//import {LogLevel} from 'homebridge';
import {inspect} from 'util';
import {CovivaCharacteristic} from './base';
import {BaseAccessory} from '../BaseAccessory';

export type PositionStateCharacteristicData = { positionstate: string }
type DeviceWithPositionStateCharacteristic = Coviva_Node<CovivaDeviceState & PositionStateCharacteristicData>

export class PositionStateCharacteristic extends CovivaCharacteristic {
  public static Title = 'Characteristic.PositionState'

  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
  public static HomekitCharacteristic(accessory: BaseAccessory) {
    return accessory.platform.Characteristic.PositionState;
  }
  /* eslint-enable @typescript-eslint/explicit-module-boundary-types */

  public static DEFAULT_VALUE = 100;

  public static isSupportedByAccessory(accessory: BaseAccessory): boolean {
    const configData = accessory.deviceConfig.data;

    return configData.positionstate !== undefined;
  }

  public getRemoteValue(callback: CharacteristicGetCallback): void {
    this.info('getRemoteValue for position state');
    this.accessory.getDeviceState<PositionStateCharacteristicData>().then((data) => {
      this.debug('[GET] %s', data?.positionstate);
      this.updateValue(data, callback);
    }).catch(this.accessory.handleError('GET', callback));
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  public setRemoteValue(homekitValue: CharacteristicValue, callback: CharacteristicSetCallback): void {
    // Set device state in Coviva API
    const value = homekitValue as number;

    this.debug('PositionState.setRemoteValue() [%d]', value);

    // This attribute cannot be set from HomeKit
    return;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  updateValue(data: DeviceWithPositionStateCharacteristic['data'] | undefined, callback?: CharacteristicGetCallback): void {
    if (typeof data?.positionstate !== 'undefined') {
      this.debug('Setting Current Position to %d', data?.positionstate);
      this.accessory.setCharacteristic(this.homekitCharacteristic, data?.positionstate, !callback);
      callback && callback(null, data?.positionstate);
      return;
    }

    this.error('Tried to set position state but failed to parse data.\n %s', inspect(data));
  }
}
