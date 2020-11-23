import {Coviva_Node, CovivaDeviceState} from '../../CovivaAPI';
import {CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue} from 'homebridge';
import {CovivaCharacteristic} from './base';
import {BaseAccessory} from '../BaseAccessory';

export type OnCharacteristicData = { state: boolean | 'true' | 'false' }
type DeviceWithOnCharacteristic = Coviva_Node<CovivaDeviceState & OnCharacteristicData>

export class OnCharacteristic extends CovivaCharacteristic {
  public static Title = 'Characteristic.On'

  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
  public static HomekitCharacteristic(accessory: BaseAccessory) {
    return accessory.platform.Characteristic.On;
  }
  /* eslint-enable @typescript-eslint/explicit-module-boundary-types */

  public static isSupportedByAccessory(accessory: BaseAccessory): boolean {
    return accessory.deviceConfig.data.state !== undefined;
  }

  public getRemoteValue(callback: CharacteristicGetCallback): void {
    this.accessory.getDeviceState<OnCharacteristicData>().then((data) => {
      this.debug('[GET] %s', data?.state);
      this.updateValue(data, callback);
    }).catch(this.accessory.handleError('GET', callback));
      
  }

  public setRemoteValue(homekitValue: CharacteristicValue, callback: CharacteristicSetCallback): void {
    // Set device state in Coviva API
    const value = homekitValue ? 1 : 0;

    this.accessory.setDeviceState('turnOnOff', {value}, {state: homekitValue}).then(() => {
      this.debug('[SET] %s %s', homekitValue, value);
      callback();
    }).catch(this.accessory.handleError('SET', callback));
  }

  updateValue(data: DeviceWithOnCharacteristic['data'] | undefined, callback?: CharacteristicGetCallback): void {
    if (data?.state !== undefined) {
      const stateValue = (String(data.state).toLowerCase() === 'true');
      this.accessory.setCharacteristic(this.homekitCharacteristic, stateValue, !callback);
      callback && callback(null, stateValue);
    }
  }
}
