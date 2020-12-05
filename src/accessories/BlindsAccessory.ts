import {BaseAccessory} from './BaseAccessory';
import {Coviva_Node, CovivaDeviceState} from '../CovivaAPI';
import {HomebridgeAccessory, CovivaHagerPlatform} from '../platform';
import {Categories} from 'homebridge';
import {
  CurrentPositionCharacteristic,
  CurrentPositionCharacteristicData,
  TargetPositionCharacteristic,
  TargetPositionCharacteristicData,
  PositionStateCharacteristic,
  PositionStateCharacteristicData
} from './characteristics';

type BlindsAccessoryConfig = Coviva_Node<CovivaDeviceState & CurrentPositionCharacteristicData & TargetPositionCharacteristicData & PositionStateCharacteristicData>

export class BlindsAccessory extends BaseAccessory<BlindsAccessoryConfig> {

  constructor(
    platform: CovivaHagerPlatform,
    homebridgeAccessory: HomebridgeAccessory<BlindsAccessoryConfig>,
    deviceConfig: BlindsAccessoryConfig) {
    super(platform, homebridgeAccessory, deviceConfig, Categories.WINDOW_COVERING);

    new CurrentPositionCharacteristic(this as BaseAccessory);
    new TargetPositionCharacteristic(this as BaseAccessory);
    new PositionStateCharacteristic(this as BaseAccessory);
  }
}
