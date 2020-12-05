import {PlatformConfig} from 'homebridge';

type Config = {
  options?: {
    username?: string,
    password?: string,
    covivaId?: string,
    pollingInterval?: number,
    pingInterval?: number,
    enableExperimental?: boolean
  }
}

export type CovivaHagerConfig = PlatformConfig & Config;
