import {Coviva_Node} from '../CovivaAPI';

export class DeviceList {
  private idNameMap: { [key: string]: string } = {}

  constructor(devices: Coviva_Node[]) {
    devices.forEach(device => {
      this.idNameMap[device.id] = device.name;
    });
  }

  /*
   * Returns the device ID belonging to the supplied identifier
   * @param identifier
   */
  public find(identifier: string): string | undefined {
    if (Object.keys(this.idNameMap).includes(identifier)) {
      return identifier;
    }

    if (Object.values(this.idNameMap).includes(identifier)) {
      return Object.keys(this.idNameMap).find(key => this.idNameMap[key] === identifier);
    }

    return undefined;
  }

  public nameForIdentifier(identifier: string): string | undefined {
    const id = this.find(identifier);
    if(!id) {
      return undefined;
    }
    return this.idNameMap[id];
  }

  /*
   * Returns all device ids in this list
   */
  public get all(): string[] {
    return Object.keys(this.idNameMap);
  }
}
