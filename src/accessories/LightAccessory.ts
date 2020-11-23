import {BaseAccessory} from './BaseAccessory';
import {Coviva_Node, CovivaDeviceState} from '../CovivaAPI';
import {HomebridgeAccessory, CovivaHagerPlatform} from '../platform';
import {Categories} from 'homebridge';
import {
  BrightnessCharacteristic,
  BrightnessCharacteristicData,
  OnCharacteristic,
  OnCharacteristicData,
} from './characteristics';

type LightAccessoryConfig = Coviva_Node<CovivaDeviceState & OnCharacteristicData & (BrightnessCharacteristicData)>

export class LightAccessory extends BaseAccessory<LightAccessoryConfig> {

  constructor(
    platform: CovivaHagerPlatform,
    homebridgeAccessory: HomebridgeAccessory<LightAccessoryConfig>,
    deviceConfig: LightAccessoryConfig) {
    super(platform, homebridgeAccessory, deviceConfig, Categories.LIGHTBULB);

    new OnCharacteristic(this as BaseAccessory);
    new BrightnessCharacteristic(this as BaseAccessory);
  }
}
