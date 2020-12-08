# Change Log

All notable changes to this project will be documented in this file.

## 0.1.38 (2020-12-08)

### Changes

* Documentation update

## 0.1.37 (2020-12-07)

### Changes

* Roller Shutter / Blinds support has been confirmed by a user to be working, and promoted to non-experimental

## 0.1.36 (2020-12-06)

### Bugfix

* Link targetPositionSet command to Coviva attribute 15 for blinds
* And flip incoming target value from HomeKit to Coviva convention

## 0.1.34 (2020-12-06)

### Changes

* Add extra logging for experimental device support

## 0.1.33 (2020-12-06)

### Bug Fixes

* Fix missing service type for Coviva Roller / Shutter modules

## 0.1.32 (2020-12-06)

### Changes

* Add new 'enableExperimental' configuration option to 'opt in' to new, untested device type support

## 0.1.30 (2020-12-05)

### Changes

* Support for Coviva Roller / Shutter modules (to be tested)
* Added python test programs for:
  * Getting a dump of the Coviva configuration (get_all.py)
  * Getting a dump of Coviva devices in the Coviva configuration (get_nodes.py)
  * Setting an example node's example attribute to an example value (put.py)

## 0.1.29 (2020-12-05)

### Changes

* Added extra information to the Homebridge log file about "unsupported" devices

## 0.1.28 (2020-12-04)

### Changes

* Documentation changes only

## 0.1.27 (2020-12-01)

### Bug Fixes

* Improve log messages when ignoring events from non-supported devices
* Correct identification of whether a device supports Brightness attribute or not
* Correct interpretation of current_state vs target_state from incoming Coviva events
* Correct interpretation of current_state vs target_state from incoming Coviva events
* Capture debug information about what HomeKit is told about device states
* Changed some log messages from "info" to "debug"
* Fixes to help maintain connectivity to Coviva


