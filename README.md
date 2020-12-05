# homebridge-coviva-hager
Homebridge plugin for Coviva by Hager

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

## Overview

Homebridge plugin for Hager Coviva devices (unofficial)

## Features

Currently, this plugin only supports a dimmer module, and I hope to add support for a switch
module as soon as the parts arrive and are installed in my home.

If you'd like me to add support for a different type of module, please have a look at your
Homebridge log file.  For each unsupported device, you will see a message like this:

```
Ignoring device [AAA] with unsupported profile [BBB]
```

where BBB is a number.  E.g. the profile number for the supported dimmer module is 15.

Log an issue via GitHub with the following details:

* Profile number from the log message
* Type of device
* Coviva Part Number (if known)

and I'll see what I can do.

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

This Homebridge plugin, like the official Hager web interface (and probably the phone apps)
connects to the Coviva API via a WebSocket.  The Coviva API will actually push notifications
of events down the WebSocket to the Homebridge plugin immediately, so it should be able to
keep track of state changes that were initiated elsewhere (lights operated at the switch or
via another app) without the need for polling.

You can link Netatmo devices to Coviva within the phone App, and I've actually found the Coviva
phone app might actually be the fastest way for me to bring up live footage from my cameras.
A side effect of this is that the Homebridge plugin is regularly receiving events from
any linked Netatmo devices.  The plugin is currently ignoring them -- the Netatmo devices
directly support HomeKit without the need for a HomeKit plugin.  However in future I might
use it to e.g. gather a CSV log of temperatures from the Weather station over time.

The Coviva API supports other commands relating to "groups" and "covivagrams" aka "homeegrams",
however I have not attempted to do anything with these yet.  Perhaps it will make sense to
add support for "groups", but for now I'm using HomeKit "rooms" to switch multiple lights at
the same time.

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
      "pingInterval": 20
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

## Tested devices

Tested:

* Coviva Micro Module - On/Off with Neutral (TRM693AU)
* Coviva Micro Module - Dimmer - 2 wire (TRM691AU)

In progress:

* Coviva Micro Module - Roller Blind / Shutter (TRM692G)

## Credits

The code for this HomeKit plugin is based on @milo526/homebridge-tuya-web, adapted to
use a WebSocket API.  I also referred to homebride-ewelink to help me understand how to
use WebSockets in Javascript/Typescript.

To reverse-engineeer the Coviva API, I used [Charles](http://charlesproxy.com) to trace
the activity of the iOS app and the web interface.  Yes, there's a web interface:  If you
log into hager.com and look at your account, there will be a link to your Coviva Hub
that will allow you to control it.

benni4k for providing trace information for the Roller Blind / Shutter module
