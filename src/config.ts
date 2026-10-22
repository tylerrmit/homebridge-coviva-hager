import {PlatformConfig} from 'homebridge';

type Config = {
  options?: {
    username?: string,
    password?: string,
    covivaId?: string,
    pollingInterval?: number,
    pingInterval?: number,
    enableExperimental?: boolean,
    pilotWireModes?: { [value: string]: string }
  }
}

export type CovivaHagerConfig = PlatformConfig & Config;
