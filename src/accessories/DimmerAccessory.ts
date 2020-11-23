import {BaseAccessory} from './BaseAccessory';
import {Coviva_Node, CovivaDeviceState} from '../CovivaAPI';
import {HomebridgeAccessory, CovivaHagerPlatform} from '../platform';
import {Categories} from 'homebridge';
import {OnCharacteristic, OnCharacteristicData} from './characteristics';

type DimmerAccessoryConfig = Coviva_Node & {
  data: CovivaDeviceState & OnCharacteristicData
}

export class DimmerAccessory extends BaseAccessory<DimmerAccessoryConfig> {

  constructor(
    platform: CovivaHagerPlatform,
    homebridgeAccessory: HomebridgeAccessory<DimmerAccessoryConfig>,
    deviceConfig: DimmerAccessoryConfig) {
    super(platform, homebridgeAccessory, deviceConfig, Categories.LIGHTBULB);

    new OnCharacteristic(this as BaseAccessory);
  }
}
