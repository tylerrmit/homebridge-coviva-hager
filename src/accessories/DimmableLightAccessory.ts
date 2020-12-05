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

type DimmableLightAccessoryConfig = Coviva_Node<CovivaDeviceState & OnCharacteristicData & (BrightnessCharacteristicData)>

export class DimmableLightAccessory extends BaseAccessory<DimmableLightAccessoryConfig> {

  constructor(
    platform: CovivaHagerPlatform,
    homebridgeAccessory: HomebridgeAccessory<DimmableLightAccessoryConfig>,
    deviceConfig: DimmableLightAccessoryConfig) {
    super(platform, homebridgeAccessory, deviceConfig, Categories.LIGHTBULB);

    new OnCharacteristic(this as BaseAccessory);
    new BrightnessCharacteristic(this as BaseAccessory);
  }
}
