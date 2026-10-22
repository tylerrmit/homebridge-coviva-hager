import {BaseAccessory} from './BaseAccessory';
import {Coviva_Node, CovivaDeviceState, ATTRIBUTE_HVAC_MODE} from '../CovivaAPI';
import {HomebridgeAccessory, CovivaHagerPlatform} from '../platform';
import {Categories, CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue, Service} from 'homebridge';

type PilotWireData = CovivaDeviceState & { hvacmode?: number };
type PilotWireAccessoryConfig = Coviva_Node<PilotWireData>;

// Default labels for the pilot wire mode values reported by Coviva (attribute type 127).
// Values can be renamed, or hidden with an empty string, via options.pilotWireModes.
export const DEFAULT_PILOT_WIRE_MODES: { [value: string]: string } = {
  '33': 'Réduit',
  '34': 'Hors gel',
};

/*
 * Electrical heating module (Coviva profile 3024, "fil pilote").
 *
 * HomeKit has no "select" concept, so each pilot wire mode is exposed as its own
 * Switch service on the accessory. Exactly one switch is on at a time: turning a
 * switch on sends that mode to Coviva; turning the active switch off is refused.
 */
export class PilotWireAccessory extends BaseAccessory<PilotWireAccessoryConfig> {
  private readonly modeServices: Map<number, Service> = new Map();
  private currentMode?: number;

  constructor(
    platform: CovivaHagerPlatform,
    homebridgeAccessory: HomebridgeAccessory<PilotWireAccessoryConfig>,
    deviceConfig: PilotWireAccessoryConfig) {
    super(platform, homebridgeAccessory, deviceConfig, Categories.OTHER);

    const attribute = deviceConfig.attributes.find(a => a.type == ATTRIBUTE_HVAC_MODE);
    const min = attribute ? attribute.minimum : 30;
    const max = attribute ? attribute.maximum : 34;
    const labels = {...DEFAULT_PILOT_WIRE_MODES, ...(platform.pilotWireModes || {})};

    this.currentMode = deviceConfig.data?.hvacmode;

    const wantedSubtypes: string[] = [];

    for (let value = min; value <= max; value++) {
      const label = Object.prototype.hasOwnProperty.call(labels, String(value)) ? labels[String(value)] : 'Mode ' + value;
      if (label === '' || label === null) {
        continue; // Hidden by configuration
      }

      const subtype = 'pilotwire-' + value;
      const name = deviceConfig.name + ' ' + label;
      wantedSubtypes.push(subtype);

      const service =
        this.homebridgeAccessory.getServiceById(platform.Service.Switch, subtype) ||
        this.homebridgeAccessory.addService(platform.Service.Switch, name, subtype);
      service.setCharacteristic(platform.Characteristic.Name, name);

      service.getCharacteristic(platform.Characteristic.On)
        .on('get', (callback: CharacteristicGetCallback) => this.getMode(value, callback))
        .on('set', (homekitValue: CharacteristicValue, callback: CharacteristicSetCallback) => this.setMode(value, homekitValue, callback));

      this.modeServices.set(value, service);
    }

    // Remove switches left over from a previous configuration
    for (const service of [...this.homebridgeAccessory.services]) {
      if (service.UUID == platform.Service.Switch.UUID && service.subtype && !wantedSubtypes.includes(service.subtype)) {
        this.info('Removing obsolete mode switch [%s]', service.displayName);
        this.homebridgeAccessory.removeService(service);
      }
    }

    // Called by BaseAccessory.updateAccessory() whenever Coviva reports new state
    this.addUpdateCallback(platform.Characteristic.On, (data) => {
      if (data?.hvacmode !== undefined) {
        this.currentMode = data.hvacmode;
        this.pushStates();
      }
    });
  }

  private getMode(value: number, callback: CharacteristicGetCallback): void {
    this.getDeviceState<PilotWireData>().then((data) => {
      if (data?.hvacmode !== undefined) {
        this.currentMode = data.hvacmode;
      }
      callback(null, this.currentMode === value);
    }).catch(this.handleError('GET', callback));
  }

  private setMode(value: number, homekitValue: CharacteristicValue, callback: CharacteristicSetCallback): void {
    if (!homekitValue) {
      // A mode cannot be "switched off": pick another mode instead. Revert the switch.
      callback();
      if (this.currentMode === value) {
        setTimeout(() => this.pushStates(), 300);
      }
      return;
    }

    this.info('Setting pilot wire mode [%d]', value);
    this.setDeviceState('pilotWireModeSet', {value}, {hvacmode: value}).then(() => {
      this.currentMode = value;
      callback();
      this.pushStates();
    }).catch(this.handleError('SET', callback));
  }

  private pushStates(): void {
    for (const [value, service] of this.modeServices) {
      service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.currentMode === value);
    }
  }
}
