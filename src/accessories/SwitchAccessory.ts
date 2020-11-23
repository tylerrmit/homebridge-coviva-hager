import {BaseAccessory} from './BaseAccessory';
import {Coviva_Node, CovivaDeviceState} from '../CovivaAPI';
import {HomebridgeAccessory, CovivaHagerPlatform} from '../platform';
import {Categories} from 'homebridge';
import {OnCharacteristic, OnCharacteristicData} from './characteristics';

type SwitchAccessoryConfig = Coviva_Node & {
  data: CovivaDeviceState & OnCharacteristicData
}

export class SwitchAccessory extends BaseAccessory<SwitchAccessoryConfig> {

  constructor(
    platform: CovivaHagerPlatform,
    homebridgeAccessory: HomebridgeAccessory<SwitchAccessoryConfig>,
    deviceConfig: SwitchAccessoryConfig) {
    super(platform, homebridgeAccessory, deviceConfig, Categories.SWITCH);

    new OnCharacteristic(this as BaseAccessory);
  }
}
