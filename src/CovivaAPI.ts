import jsSHA from 'jssha';
import getMAC from 'getmac';
import axios from 'axios';
import * as querystring from 'querystring';

import WebSocket from 'ws';

/* eslint-disable @typescript-eslint/no-var-requires */
const Channel = require('chnl');
/* eslint-enable @typescript-eslint/no-var-requires */

import PromiseController from 'promise-controller';

import {Logger} from 'homebridge';

import {CovivaHagerPlatform} from './platform';


/* Inspired by TuyaWebApi.ts */

/****************/
/* Custom Types */
/* **************/

// Store the parsed state information for each characteristic
// of a device, plus whether it is online or offline
export type CovivaDeviceState = {
  online:     boolean,
  state:      boolean,
  brightness: number
};

// A list of supported commands to send to a Coviva device
export type CovivaApiMethod = 'turnOnOff' | 'brightnessSet';

// Valid settings for each command
export type CovivaApiPayload<Method extends CovivaApiMethod> = Method extends 'turnOnOff'
  ? { value: 0 | 1 }
  : Method extends 'brightnessSet'
    ? { value: number }
    : never;


/**********************/
/* JSON2TS interfaces */
/**********************/

// These interfaces are designed to match the structure of the JSON
// messages sent down the WebSocket to our plugin by the Coviva API
// They were generated by dumping copies of received JSON to the log
// file / stdout, the pasting them into http://json2ts.com to generate
// the interfaces automatically

// Only slight modifications from what json2ts.com produced:
// - Add Coviva_ prefix
// - Make Coviva_Node "generic"

// Coviva_Device: This is not what you probably think.  It is a really
// a client device.  E.g. you get one of these per iPhone that you've
// logged into Covvia with, each with a unique hardware ID.
// What you probably want is Coviva_Node, below-- a "node" is a device
// that can be controlled by Coviva
export interface Coviva_Device {
  id:                          number;
  user_id:                     number;
  hardware_id:                 string;
  name:                        string;
  added:                       number;
  last_connected:              number;
  os:                          number;
  type:                        number;
  app:                         number;
  connected:                   number;
  push_registration_id:        string;
}

export interface Coviva_User {
  id:                          number;
  username:                    string;
  forename:                    string;
  surname:                     string;
  image:                       string;
  role:                        number;
  type:                        number;
  email:                       string;
  phone:                       string;
  added:                       number;
  homee_name:                  string;
  homee_image:                 string;
  access:                      number;
  cube_push_notifications:     number;
  cube_email_notifications:    number;
  cube_sms_notifications:      number;
  node_push_notifications:     number;
  node_email_notifications:    number;
  node_sms_notifications:      number;
  warning_push_notifications:  number;
  warning_email_notifications: number;
  warning_sms_notifications:   number;
  update_push_notifications:   number;
  update_email_notifications:  number;
  update_sms_notifications:    number;
  devices:                     Coviva_Device[];
}

export interface Coviva_Attribute {
  id:                          number;
  node_id:                     number;
  instance:                    number;
  minimum:                     number;
  maximum:                     number;
  current_value:               number;
  target_value:                number;
  last_value:                  number;
  unit:                        string;
  step_value:                  number;
  editable:                    number;
  type:                        number;
  state:                       number;
  last_changed:                number;
  changed_by:                  number;
  changed_by_id:               number;
  based_on:                    number;
  data:                        string;
  //options:                     any[];
}

export interface Coviva_Node<State extends CovivaDeviceState = CovivaDeviceState> {
  id:                          number;
  name:                        string;
  profile:                     number;
  image:                       string;
  favorite:                    number;
  order:                       number;
  protocol:                    number;
  routing:                     number;
  state:                       number;
  state_changed:               number;
  added:                       number;
  history:                     number;
  cube_type:                   number;
  note:                        string;
  services:                    number;
  phonetic_name:               string;
  owner:                       number;
  //denied_user_ids:             any[];
  attributes:                  Coviva_Attribute[];
  data:                        State; // This was added to hold parsed state data
}

export interface Coviva_Group {
  id:                          number;
  name:                        string;
  image:                       string;
  order:                       number;
  added:                       number;
  state:                       number;
  category:                    number;
  services:                    number;
  phonetic_name:               string;
  owner:                       number;
}

export interface Coviva_Relationship {
  id:                          number;
  group_id:                    number;
  node_id:                     number;
  homeegram_id:                number;
  order:                       number;
}

export interface Coviva_Cube {
  type:                        number;
  order:                       number;
  current_firmware:            string;
  available_firmware:          string;
  current_radio_firmware:      string;
  available_radio_firmware:    string;
}

export interface Coviva_AmazonAlexa {
  enabled:                     number;
}

export interface Coviva_GoogleAssistant {
  enabled:                     number;
  syncing:                     number;
}

export interface Coviva_Extensions {
  amazon_alexa:                Coviva_AmazonAlexa;
  google_assistant:            Coviva_GoogleAssistant;
}

export interface Coviva_Settings {
  address:                     string;
  city:                        string;
  zip:                         string;
  state:                       string;
  latitude:                    number;
  longitude:                   number;
  altitude:                    number;
  country:                     string;
  language:                    string;
  wlan_ssid:                   string;
  online:                      number;
  wlan_dhcp:                   number;
  lan_ip_address:              string;
  wlan_subnet_mask:            string;
  wlan_router:                 string;
  wlan_dns:                    string;
  wlan_mode:                   number;
  wlan_enabled:                number;
  lan_dhcp:                    number;
  version:                     string;
  lan_subnet_mask:             string;
  lan_router:                  string;
  lan_dns:                     string;
  remote_access:               number;
  stand_alone_mode:            number;
  gateway_id:                  string;
  volume:                      number;
  name:                        string;
  ssh:                         string;
  beta:                        number;
  webhooks_key:                string;
  knx_frequency:               number;
  airplay:                     string;
  dlna:                        string;
  leds:                        number;
  coviva_box_env:              number;
  proxy_exchange_state:        number;
  timezone:                    string;
  wlan_ip_address:             string;
  time:                        number;
  civil_time:                  string;
  uid:                         string;
  lan_enabled:                 number;
  cubes:                       Coviva_Cube[];
  //available_ssids:             any[];
  extensions:                  Coviva_Extensions;
}

export interface Coviva_All {
  users:                       Coviva_User[];
  nodes:                       Coviva_Node[];
  groups:                      Coviva_Group[];
  relationships:               Coviva_Relationship[];
  //homeegrams:                  any[];
  settings:                    Coviva_Settings;
}

export interface Coviva_RootObject {
  all:                         Coviva_All;
}


/*
 * Session: Private object to maintain the WebSocket connection for Coviva API commands
 *
 * Does connect to the Coviva API via WebSocket
 *
 * Does maintain an Access Token for creating new connections to the Coviva API,
 * getting a new token on new connection, if the old one has expired.
 *
 * Does send requests to the Coviva API and pass on responses as Interface/Objects
 * based on the received JSON
 *
 * Does NOT try to interpret the responses or decide what requests -> CovivaAPI
 *
 * Does NOT try to interface with HomeKit -> platform object and its dependencies
 *
 */
class Session {
  // Coviva ID and URL to use for Coviva API WebSocket requests
  private username!:           string;
  private password!:           string;
  private covivaId!:           string;
  private log:                 Logger;
  private platform:            CovivaHagerPlatform;

  // Each new connection to the Coviva API WebSocket requires an access token
  // Keep track of the access_token and when it will expire
  private _accessToken!:       string;
  private _expiresOn           = 0;

  // Only mention some things in the log when first starting up
  private _startedUp           = false;

  // How this plugin will identify itself to Coviva  
  private device_hardware_id   = '';
  private user_agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15';

  // URL for Websocket and the WebSocket itself
  private ws_url!:          string;
  private ws!:              WebSocket | undefined;

  // Objects to handle asynchronous communication channels on WebSocket 
  private _wsSubscription!: typeof Channel.Subscription | undefined;
  private _onMessage!:      typeof Channel              | undefined;
  private _onClose!:        typeof Channel              | undefined;
  private _onError!:        typeof Channel              | undefined;

  private _pc_devicelist!:  typeof PromiseController    | undefined;

  // Cached information about devices and latest known status
  private _cachedDevices:   Coviva_Node[] = [];

  // Public information on whether the WebSocket is currently open
  public wsIsOpen = false;

  // Array of delayed messages to send
  private _delayed:         string[] = [];

  constructor(
    private _username:        string,
    private _password:        string,
    private _covivaId:        string,
    private _log:             Logger,
    private _platform:        CovivaHagerPlatform
  ) {
    this.username        = _username;
    this.password        = _password;
    this.covivaId        = _covivaId;
    this.log             = _log;
    this.platform        = _platform;

    // Coviva Hager API wants some sort of device id as a string of hex,
    // to uniquely identify each iOS app, etc.
    // We don't want it to be random, otherwise pretty soon there will be 100s
    // or 1000s of client devices recorded against our Coviva account.

    // Generate a "hardware id" from a mac addr on this system, by hashing it
    // and taking a substring of the desired length
    const shaObj = new jsSHA("SHA-512", "TEXT");
    shaObj.update(getMAC());
    this.device_hardware_id = shaObj.getHash("HEX").substring(1, 34);

    // Initialise PromiseControllers
    // This allows us to wait for a response to a device list request,
    // keep holding onto the promise until there is an actual response
    // to that request type, rather than just resolving or rejecting
    // the promise outright when something else is read from the WebSocket
    // e.g. User login event
    this._wsSubscription = undefined;
    this._createDeviceListController();
    this._createChannels();

    // We do not get the access token and open the WebSocket during the constructor
    // Those are asynchronous processes
    this.wsIsOpen = false;
  }

  // Issue an HTTPS POST request with hashed Coviva username + password
  // to get the "access token" that is required to open a WebSocket
  // The "access token" is included in a WSS GET request to open the WebSocket
  // and it is only valid for a limited amount of time.  (1 hour?)
  public async requestToken() {
    this.log.debug('Obtaining access tokent for Coviva API');

    // Build 'Basic' authentication string
    const username_encoded = encodeURIComponent(this.username);
    const shaObj = new jsSHA("SHA-512", "TEXT");
    shaObj.update(this.password);
    const hash   = shaObj.getHash("HEX");
    const auth_decoded = username_encoded + ':' + hash;
    const auth_encoded = 'Basic ' + Buffer.from(auth_decoded).toString('base64');

    const res = await axios.post(
      'https://' + this.covivaId + '.koalabox.net/access_token',
      querystring.stringify({
        device_hardware_id: this.device_hardware_id,
        device_name:        'Web%20App%20%7C%20Safari',
        device_type:        '4',
        device_os:          '6',
        device_app:         '4'
      }),
      {
        headers: {
          'Host':            this.covivaId + '.koalabox.net',
          'Origin':          'http://mycoviva.net',
         'Accept-Language': 'en-au',
          'Accept':          'application/json, text/plain, */*',
          'User-Agent':      this.user_agent,
          'Authorization':   auth_encoded,
          'Referer':         'http://mycoviva.net'
        },
      }
    );

    if (res.status != 200) {
      this.log.error('Unable to authenticate [' + res.status + ']: [' + res.statusText + ']');
    }
    else {
      // Parse the response to get the access token and how long
      // it'll be before it expires
      const params = res.data.split('&');

      let token = '';
      let expires_in = 0;

      for (let i = 0; i < params.length; i++) {
        const key = params[i].split("=")[0];
        const val = params[i].split("=")[1];

        if (key == 'access_token') {
          token = val;
        }
        else if (key == 'expires') {
          expires_in = parseInt(val);
        }
      }

      this._accessToken = token;
      this._expiresOn   = Session.getCurrentEpoch() + expires_in - 100;
      this.ws_url = 'wss://' + this.covivaId + '.koalabox.net/connection?access_token=' + this._accessToken;
    }
  }

  public static getCurrentEpoch(): number {
    return Math.round((new Date()).getTime() / 1000);
  }

  public get accessToken(): string {
    return this._accessToken;
  }

  public hasToken(): boolean {
    return !!this._accessToken;
  }

  public isTokenExpired(): boolean {
    return this._expiresOn < Session.getCurrentEpoch();
  }

  public hasValidToken(): boolean {
    return this.hasToken() && !this.isTokenExpired();
  }

  // Open a WebSocket connection to the Coviva API, requesting a new
  // access token first, if rquired
  public async login(): Promise<void> {
    if (!this.hasValidToken()) {
      await this.requestToken();
    }

    // Close any existing connection first
    try {
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      if (typeof this.ws! !== undefined) {
        this.ws!.close()
        this.wsIsOpen = false;
        this.log.info('Closed existing connection to Coviva API');
      }
      /* eslint-enable @typescript-eslint/no-non-null-assertion */
    }
    catch (e) {
      this.log.debug('Unable to close existing connection');
    }

    this.log.info('Opening WebSocket connection to Coviva API');

    try {
      this.ws = new WebSocket(this.ws_url, 'v2');

      const ready = new Promise((resolve, reject) => {
        if (typeof this.ws !== undefined) {
          /* eslint-disable @typescript-eslint/no-non-null-assertion */
          this.ws!.onopen  = resolve;
          this.ws!.onerror = reject;
          this.ws!.onclose = reject;
          /* eslint-enable @typescript-eslint/no-non-null-assertion */
        }
      });

      await ready;

      // Set up "channels" for subscribing to key "events" on the WebSocket
      this._wsSubscription = new Channel.Subscription([
        { channel: this.ws, event: 'message', listener: e => this._handleMessage(e) },
        { channel: this.ws, event: 'close',   listener: e => this._handleClose(e) },
        { channel: this.ws, event: 'error',   listener: e => this._handleError(e) }
      ]).on();

      // Record that the WebSocket is currently open
      this.wsIsOpen = true;

      this.log.info('Opened WebSocket connection to Coviva API');

      // Resend any delayed messages
      if (this._delayed.length > 0) {
        this.log.info('Resending %d delayed messages', this._delayed.length);

        for (let m=0; m < this._delayed.length; m++) {
          const msg = this._delayed[m];

          this.log.info('WS Resend: [' + msg + ']');

          if (typeof this.ws !== undefined) {
            try {
              /* eslint-disable @typescript-eslint/no-non-null-assertion */
              this.ws!.send(msg);
              /* eslint-enable @typescript-eslint/no-non-null-assertion */
            }
            catch (e) {
              this.log.warn('Unable to resend message [' + msg + ']');
            }
          }
        }

        this._delayed = [];
      }
    }
    catch (e) {
      this.log.info('Unable to connect, retrying on next ping/message');
    }
  }

  // Get the device list via "GET:all", in such a way that the caller
  // is returned a "Promise" when the results finally arrive.
  // The WebSocket activity is all asynchronous...  When we send a "GET:all"
  // command, there is no guarantee that the NEXT response we receive will be
  // for that request, it might be a random update that someone has flicked a
  // switch.  Therefore we are using the "Promise Controller" this._pc_devicelist
  // to help us co-ordinate.  There will be a callback function responsible for
  // parsing incoming messages, and when it sees a full device list like we
  // expect in response to "GET:all", it will signal to the "Promise Controller"
  // to anything waiting on the results of "GET:all" that they have arrived,
  // have been parsed, and are waiting for them in this._cachedDevices
  public async getDeviceList(): Promise<Coviva_Node[]> {
    if (!this.hasToken()) {
      this.log.warn('No valid token on getDeviceList()');
      await this.login();
    }

    // Make a promise that is controlled by this._pc_devicelist
    await this._pc_devicelist.call(() => {
      this.sendMessage('GET:all');
    });

    return this._cachedDevices;
  }

  // Return the latest we have on all supported Coviva devices
  public get cachedDevices(): Coviva_Node[] {
    return this._cachedDevices;
  }

  // Send a message/command to Coviva via the WebSocket
  public sendMessage(msg): void {
    this.log.info('WS Send: [' + msg + ']');

    if (typeof this.ws !== undefined) {
      try {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        this.ws!.send(msg);
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
      }
      catch (e) {
        this.log.warn('Unable to send message [' + msg + ']');

        // Add this message to the list of delayed messages, so we can re-send
        this._delayed.push(msg);

        // Reconnect
        this.login();
      }
    }
  }

  public isSupported(profile: number): boolean {
    let retVal = false;

    switch (profile) {
      case 10: // On/Off
      case 15: // Dimmer
        retVal = true;
        break;
      case 1: // Base Station
      case 3014: // Netatmo Weather Base Station
      case 3015: // Netatmo Weather Outdoor Thermometer
      case 3017: // Netatmo Weather Rain Gauge
      case 3023: // Netatmo Weather Wind Gauge
      case 3026: // Netatmo Welcome Camera
      case 3027: // Netatmo Presence Camera
        retVal = false;
        break;
      default:
        retVal = false
        break;
    }
    
    return retVal;
  }
  
  public brightnessSupported(profile: number): boolean {
    let retVal = false;

    switch (profile) {
      case 10: // On/Off
        retVal = true;
        break;
      case 1: // Base Station
      case 15: // Dimmer
      case 3014: // Netatmo Weather Base Station
      case 3015: // Netatmo Weather Outdoor Thermometer
      case 3017: // Netatmo Weather Rain Gauge
      case 3023: // Netatmo Weather Wind Gauge
      case 3026: // Netatmo Welcome Camera
      case 3027: // Netatmo Presence Camera
        retVal = false;
        break;
      default:
        retVal = false
        break;
    }
    
    return retVal;
  }

  public profileName(profile: number): string {
    let retVal = 'Unknown'

    switch (profile) {
      case 1: // Base Station
        retVal = 'Coviva Base Station';
        break;
      case 10: 
        retVal = 'Coviva On/Off Module';
        break;
      case 15:
        retVal = 'Coviva Dimmer Module';
        break;
      case 3014:
        retVal = 'Netatmo Weather Base Station';
        break;
      case 3015:
        retVal = 'Netatmo Weather Outdoor Thermometer';
        break;
      case 3017:
        retVal = 'Netatmo Weather Rain Gauge';
        break;
      case 3023:
        retVal = 'Netatmo Weather Wind Gauge';
        break;
      case 3026:
        retVal = 'Netatmo Welcome Camera';
        break;
      case 3027:
        retVal = 'Netatmo Presence Camera';
        break;
      default:
        retVal = 'Unknown';
        break;
    }
    
    return retVal;
  }

  // Create the "Promise Controller" object that will co-ordinate responses to
  // things waiting on a response to "GET:all"
  _createDeviceListController() {
    const connectionTimeout = 120 * 1000; // Two minutex for a response is more than fair
    // We could make this configurable if it were ever an issue
    this._pc_devicelist = new PromiseController({
      timeout: connectionTimeout,
      timeoutReason: `Can't get device list within allowed timeout: ${connectionTimeout} ms.`
    });
  }

  // Help set up responses to incoming messages, and signals that the WebSocket was
  // closed, or that there was an error
  _createChannels() {
    this._onMessage = new Channel();
    this._onClose   = new Channel();
    this._onError   = new Channel();
  }

  get onMessage() {
    return this._onMessage;
  }

  get onClose() {
    return this._onClose;
  }

  get onError() {
    return this._onError;
  }

  removeAllListeners() {
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    this._onMessage!.removeAllListeners();
    this._onClose!.removeAllListeners();
    this._onError!.removeAllListeners();
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
  }

  // Handle incoming messages from the WebSocket
  _handleMessage(event) {
    const data = event;
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    this._onMessage!.dispatchAsync(data);
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
    this._tryUnpack(data);
  }

  // Parse incoming messages from the WebSocket
  _tryUnpack(data) {
    if (data == 'pong') {
      // Ignore responses to a "ping"
      this.log.info('Received PONG');
      return;
    }

    let json;
    try {
      json = JSON.parse(data.toString());
    }
    catch (e) {
      this.log.warn('Coviva API unable to parse JSON message [' + data + ']');
      return;
    }

    //if (json.hasOwnProperty('all')) {
    if (Object.prototype.hasOwnProperty.call(json, 'all')) {
      // THIS is the response to a "GET:all" that something might be waiting on!

      // Parse the incoming data into the JSON interfaces we defined for it
      //const dataFromServer: Coviva_All;

      const dataFromServer = <Coviva_All>json.all;

      // Read the interesting part of the message:  Raw information about
      // every device registered on Coviva.
      // This will include the Base Station itself (profile=1) and possibly
      // unsupported devices
      this._cachedDevices = dataFromServer.nodes;

      // For each device, if it is a supported device, parse the state and
      // place it in the ".data" part of the Coviva_Node, for easy access
      // when communicating with HomeKit
      for (let i = 0; i < this._cachedDevices.length; i++) {
        // Special characters like ' ' will have been encoded according to HTTP standards
        // E.g. 'some device' -> 'some%20device'
        // Decode them back into readable form
        this._cachedDevices[i].name = decodeURIComponent(this._cachedDevices[i].name);

        // Parse state and brightness
        if (this.isSupported(this._cachedDevices[i].profile)) {
          this.log.info('Parsing state for device [%s] with supported profile [%d] [%s]', this._cachedDevices[i].name, this._cachedDevices[i].profile, this.profileName(this._cachedDevices[i].profile));
          // Initialise "data" object within Coviva_Node to hold parsed state
          this._cachedDevices[i].data = {
            online: true,
            state:  true,
            brightness: 0
          };

          // Parse attributes to find state (On/Off) and brightness
          for (let j=0; j < this._cachedDevices[i].attributes.length; j++) {
            const msg_attribute = this._cachedDevices[i].attributes[j];

            if      (msg_attribute.type == 1) {
              // On/Off
              this._cachedDevices[i].data.state = (msg_attribute.current_value == 0) ? false : true;
            }
            else if (msg_attribute.type == 2 && this.brightnessSupported(this._cachedDevices[i].profile)) {
              // Brightness
              this._cachedDevices[i].data.brightness = msg_attribute.current_value;
            }
          }
        }
        // Add support for more profile IDs here
        else if (!this._startedUp) {
          this.log.info('Ignoring device [%s] with unsupported profile [%d] [%s]', this._cachedDevices[i].name, this._cachedDevices[i].profile, this.profileName(this._cachedDevices[i].profile));
        }
      }

      // Dump device list
      //this.log.debug('Downloaded device list:');
      //this._debugDeviceList();

      // If anything was promised the device list, let them know via the Promise Controller
      if (this._pc_devicelist.isPending) {
        this._pc_devicelist.resolve();
      }

      this._startedUp = true;
    }
    else if (Object.prototype.hasOwnProperty.call(json, 'attribute')) {
      // This is a short message updating us about an attribute of a node
      // We get these when e.g. someone changes the state or brightness of a light
      // elsewhere, on the wall switch or maybe a phone app
      // They just arrive ASAP to keep us informed, therefore polling is not necessary :)

      // Read the simle "Coviva_Attriute" message into our JSON interfaces
      //const new_attribute: Coviva_Attribute;

      const new_attribute = <Coviva_Attribute>json.attribute;

      // Loop through all the devices to see which device the attribute belongs to,
      // then update our record of its current setting in this._cachedDevices
      let prev_node:      Coviva_Node;
      let prev_attribute: Coviva_Attribute;

      let genuine_update = false;

      // Loop through devices...
      loop1:
      for (let i = 0; i < this._cachedDevices.length; i++) {
        prev_node = this._cachedDevices[i];

        // Once we find the device that owns this attribute...
        if (prev_node.id == new_attribute.node_id) {

          // Find the previous record for the attribute...
          for (let j = 0; j < prev_node.attributes.length; j++) {          
            prev_attribute = prev_node.attributes[j];

            // Once we find the previous record for the attribute,
            // update our records!
            if (prev_attribute.id == new_attribute.id) {
              this._cachedDevices[i].attributes[j] = new_attribute;

              // Parse the attribute information again...  Similar to/Duplication of
              // the above code for handling a GET:all.
              // When we support more device types (profile IDs) we will probably want
              // to address this double-maintenance aspect of the code
              if (this.isSupported(this._cachedDevices[i].profile)) {
                // Parse state and brightness
                if      (new_attribute.type == 1) {
                  const new_value = (new_attribute.current_value == 0) ? false : true;

                  if (this._cachedDevices[i].data.state != new_value) {
                    genuine_update = true;
                  }

                  this._cachedDevices[i].data.state = new_value;
                }
                else if (new_attribute.type == 2 && this.brightnessSupported(this._cachedDevices[i].profile)) {
                  if (this._cachedDevices[i].data.brightness != new_attribute.current_value) {
                    genuine_update = true;
                  }

                  this._cachedDevices[i].data.brightness = new_attribute.current_value;
                }
              }

              // Tell HomeKit!
              // We want HomeKit to know immediately that the device status has changed,
              // and what the new status is

              // Potential performance improvement: Check if the status REALLY changed
              // before bothering HomeKit?  I'm assuming it's not a bother
              if (genuine_update) {
                this.platform.refreshDeviceStates([this._cachedDevices[i]]);
              }

              // We found what we were looking for, so break out of the loops
              break loop1;
            }
          }
        }
      }

      // Dump device list with updated attributes
      //this.log.debug('Updated device list:');
      this._debugDeviceList();

      return;
    }
    else if (Object.prototype.hasOwnProperty.call(json, 'user')) {
      // Ignore other users logging into Coviva
      this.log.info('Ignoring user login message');
      return;
    }

    this.log.debug('WS Message: Unknown JSON object');
    this.log.debug('WS Message: [' + data + ']');
  }

  // Dump this._cachedDevices to the log
  _debugDeviceList() {
    for (let i=0; i < this._cachedDevices.length; i++) {
      const msg_node = this._cachedDevices[i];

      if (this.isSupported(msg_node.profile)) {
        let node_debug = 'Node: ' + decodeURIComponent(msg_node.name);

        for (let j=0; j < msg_node.attributes.length; j++) {
          const msg_attribute = msg_node.attributes[j];

          if      (msg_attribute.type == 1) {
            node_debug = node_debug + ' OnOffState: [' + msg_attribute.current_value + ']';
          }
          else if (msg_attribute.type == 2 && this.brightnessSupported(msg_node.profile)) {
            node_debug = node_debug + ' Brightness: [' + msg_attribute.current_value + ']';
          }
        }

        node_debug = node_debug + ' data.state: [' + msg_node.data.state + ']';
        node_debug = node_debug + ' data.brightness: [' + msg_node.data.brightness + ']';

        this.log.debug(node_debug);
      }
    }
  }

  // What to do if the WebSocket is closed?  Re-open it!
  _handleClose(event) {
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    this._onClose!.dispatchAsync(event);
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    // We seem to get CLOSE events when the WebSocket is still open
    // Don't panic!  Wait until we fail to send a message before
    // we try to re-open the connection

    this.log.info('Received CLOSE event for Coviva API, possible false alarm');
    /*
    this.wsIsOpen = false;

    this.log.info('Coviva API WebSocket was closed');

    if (this._pc_devicelist.isPending) {
      this.log.warn('WS Close during deviceList');
    }

    // Reconnect, getting a new/valid token if necessary
    this.login();
    */
  }

  // What to do if there was an error?  Log it!
  _handleError(event) {
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    this._onError!.dispatchAsync(event);
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    this.log.warn('Coviva API WebSocket Error');

    if (this._pc_devicelist.isPending) {
      this.log.warn('WS Error during deviceList');
    }
  }
}


// The main class called by our CovivaHagerPlatform to handle communication to
// the Coviva API.  The CovivaHagerPlatform will handle communication to HomeKit.
export class CovivaAPI {
  private session:  Session;

  private username: string | undefined;
  private password: string | undefined;
  public  covivaId: string | undefined;

  private log: Logger;

  private platform: CovivaHagerPlatform;

  constructor(
    private _username:        string,
    private _password:        string,
    private _covivaId:        string,
    private _log:             Logger,
    private _platform:        CovivaHagerPlatform
  ) {
    // Save config
    this.username        = _username;
    this.password        = _password;
    this.covivaId        = _covivaId.toUpperCase(); 
    this.log             = _log;
    this.platform        = _platform;

    // Create a new Session
    this.session = new Session(
      this.username,
      this.password,
      this.covivaId,
      this.log,
      this.platform
    );
  }

  // Ask the Session object to create a WebSocket connection to the Coviva API
  public async login(): Promise<Session> {
    if (!this.session.wsIsOpen) {
      await this.session.login();
    }

    return this.session;
  }

  // Two methods to either discover all devices or get all device states... It's the same thing.
  public async getAllDeviceStates(): Promise<Coviva_Node[]> {
    return this.discoverDevices();
  }

  public async discoverDevices(): Promise<Coviva_Node[]> {
    if (!this.session?.hasToken()) {
      this.log.warn('No valid token on discoverDevices()');
      await this.session?.login();
    }

    // Ask the Session to send the command to get the device list, and wait for the Promise Controller
    // to say that the results are ready
    const devices = await this.session?.getDeviceList();

    return devices;
  }

  // Return the parsed device state "data" part of the specified Coviva_Node, from what
  // has been cached by the Session
  public async getDeviceState<T>(deviceId: string): Promise<CovivaDeviceState & T | undefined> {
    if (!this.session?.hasToken()) {
      this.log.warn('No valid token on getDeviceState()');
      await this.session?.login();
    }
 
    // Find the device by reference
    const devices = this.session?.cachedDevices;

    for (let i = 0; i < devices.length; i++) {
      if (devices[i].id.toString() == deviceId) {
        return devices[i].data as unknown as Promise<CovivaDeviceState & T | undefined>;
      } 
    }

    this.log.error('Unable to find status for device [' + deviceId + ']');
    return undefined;
  }

  // Send a command to the Coviva API to change the state of a device (node) attribute
  public async setDeviceState<Method extends CovivaApiMethod>
  (deviceId: string, method: Method, payload: CovivaApiPayload<Method>): Promise<void> {
    if (!this.session?.hasToken()) {
      this.log.warn('No valid token on setDeviceState()');
      await this.session?.login();
    }

    // We want to send the Coviva API a command like this:

    // PUT:nodes/1/attributes/4?target_value=1

    // Where the "1" in the FIRST PART = deviceId

    // And the "4" in the SECOND PART => is the device's attribute with the correct type

    // Depending on the command (method), which attribute type are we looking for?
    // In future, this might depend on the profile id of the supported device
    let attribute_type = 0;

    switch (method) {
      case 'turnOnOff':
        attribute_type = 1;
        break;
      case 'brightnessSet':
        attribute_type = 2;
        break;
      default:
        break;
    }

    if (attribute_type == 0) {
      this.log.error('Invalid method: [ ' + method + ']');
      return;
    }

    // Find the device by Id, then find the attribute by type
    const devices = this.session?.cachedDevices;
    let attribute_id = 0;

    loop1:
    for (let i = 0; i < devices.length; i++) {
      if (devices[i].id.toString() == deviceId) {
        for (let j = 0; j < devices[i].attributes.length; j++) {
          if (devices[i].attributes[j].type == attribute_type) {
            attribute_id = devices[i].attributes[j].id;

            break loop1;
          }
        }
      } 
    }

    if (attribute_id == 0) {
      this.log.warn('Unable to find attribute [%s] for device [%s]', attribute_id.toString(), deviceId);
      return;
    }

    // Assemble the command, then ask the Session to send it to Coviva
    const cmd = 'PUT:nodes/' + deviceId + '/attributes/' + attribute_id.toString() + '?target_value=' + payload.value;

    this.session?.sendMessage(cmd);

    return;
  }

  // Send a message/command to Coviva via the WebSocket
  public sendMessage(msg: string): void {
    this.session?.sendMessage(msg);
  }
}

