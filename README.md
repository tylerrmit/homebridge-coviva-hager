# homebridge-coviva-hager
Homebridge plugin for Coviva by Hager

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

## Overview

Homebridge plugin for Hager Coviva devices (unofficial)

## Features


This plugin supports on/off modules, dimmer modules, and roller shutter/blinds modules.

Each Coviva module type has a "profile ID".  If you encounter a Coviva module type that is
not (yet) supported, you will see a line like this in the Homebridge log file when Homebridge
first starts up / restarts:

```
[CovivaHagerPlatform] Ignoring device [AAA] with unsupported profile [BBB] [Unknown]
[CovivaHagerPlatform] Attribute type [5] min [0] max [50] current [19.200000762939453] unit [%C2%B0C] step value [0.5] state [1]
[CovivaHagerPlatform] Attribute type [7] min [0] max [100] current [54] unit [%25] step value [1] state [1]
```

Where [AAA] is the name of the device in the Coviva App, and [BBB] is the "profile ID"
for that type of device.  Then there will be a further log message for each "attribute" of the module.

To request support for a new Coviva module type, please log an "issue" via GitHub,
with the following details:

* The log messages from the Homebridge log similar to the above examples, showing the "profile ID"
  and details of the module's attributes
* Your description of the type of the device
* Your description of what state the device was in at the time (e.g. 'the blinds were 30% closed')
* Coviva Part Number (if known)


Known Coviva profile numbers:

* 1    = Base Station
* 10   = On/Off Module
	* Attribute Type 1 = On/Off [0-1]
* 15   = Dimmer Module
	* Attribute Type 1 = On/Off [0-1]
	* Attribute Type 2 = Brightness [0-100]
* 2002 = Shutter/blinds Module
	* Attribute Type 15 = Position [0-100]
* 3014 = Linked Netatmo Weather Base Station
* 3015 = Linked Netatmo Outdoor Thermometer
* 3017 = Linked Netatmo Rain Gauge
* 3023 = Linked Netatmo Wind Meter
* 3026 = Linked Netatmo Welcome Camera
* 3027 = Linked Netatmo Presence Camera

## Configuration

Minimal

```
"platforms": [
  {
    "platform": "CovivaHagerPlatform",
    "name": "CovivaHagerPlatform",
    "options": {
      "username": "(same as for Coviva App)",
      "password": "(same as for Coviva App)",
      "covivaId": "(same as for Coviva App)"
    }
  }
]
```

All options

```
"platforms": [
  {
    "platform": "CovivaHagerPlatform",
    "name": "CovivaHagerPlatform",
    "options": {
      "username": "(same as for Coviva App)",
      "password": "(same as for Coviva App)",
      "covivaId": "(same as for Coviva App)",
      "pollingInterval": 120,
      "pingInterval": 20,
      "enableExperimental": false
    }
  }
]
```

The username and password are self-explanatory.

The covivaId is the same detail you use when logging into the phone app.  It's a short
hexadecimal string that represents your site or Coviva hub.

The pollingInterval specifies that the Homebridge plugin should actively ask Coviva for
an update on all devices and their status every N seconds.  The default is 120.
In theory, the Coviva API is very good at proactively sending status updates, unprompted,
so you could set this to zero to disable all polling.  But I recommend polling every
few minutes, just in case.

The pingInterval will specify that the plugin should send a simple "ping" message to
Coviva every N seconds, to which Coviva should simply reply "pong".  This ensures that
the connection is kept alive.  If you set it to zero, no pings will be sent at all.
The default is 20, I.E. one ping per 20 seconds.  I believe the iPhone app sends a ping
even more frequently.  When I set this to 60 seconds, I found I had occasional disconnections.

The enableExperimental option allows you to enable support for any new device types listed
as "experimental" below.  These are devices for which we have recently attempted to add
support based on a request and trace information from a user in the field, but we have
not been able to test ourselves.  Set this option to 'true' to opt-in to support for those
devices, and help with testing.  The default is 'false': experimental devices are ignored.
This option will also cause the plugin to log all messages sent to/received from the Coviva
API in the Homebridge log file.

## Tested devices

Tested:

* Coviva Micro Module - On/Off with Neutral (TRM693AU)
* Coviva Micro Module - Dimmer - 2 wire (TRM691AU)
* Coviva Micro Module - Roller Blind / Shutter (TRM692G)

Experimental:

* None

## Credits

The code for this HomeKit plugin is based on @milo526/homebridge-tuya-web, adapted to
use a WebSocket API.  I also referred to homebride-ewelink to help me understand how to
use WebSockets in Javascript/Typescript.

To reverse-engineeer the Coviva API, I used [Charles](http://charlesproxy.com) to trace
the activity of the iOS app and the web interface.  Yes, there's a web interface:  If you
log into hager.com and look at your account, there will be a link to your Coviva Hub
that will allow you to control it.

benni4k for providing trace information for the Roller Blind / Shutter module, and working
through multiple test versions of the plugin to help get support for that type of plugin
working.
