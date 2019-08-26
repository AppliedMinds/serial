AMI Serial Wrapper
==================

Base class for creating serial-based hardware integrations with Node.js.

Features:

 * Easy event management
 * Automatic connection healing
 * Automatic line parsing of incoming messages

Requirements
------------

### Node.js 10+

 * MacOS: `brew install node` using [Homebrew](http://brew.sh/)
 * Linux: `apt install nodejs` ([see Ubuntu/Debian specific instructions](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions)) or `pacman -S nodejs` (Arch Linux)
 * Windows: [Install](https://nodejs.org/en/download/)

Installation
------------

Ensure the local AMI registry is being used:

```shell
npm set registry http://npm:4873
```

Then simply install:

```shell
npm install @ami/serial
```

Usage / Examples
----------------

`Device` should be used as a base class for any piece of hardware that uses serial to communicate.

For example, imagine a motor board that uses `F`, `B` or `S` to send forward, back or stop commands, respectively:

```javascript
const SerialDevice = require('@ami/serial').Device

class Motor extends SerialDevice {
    constructor(port) {
        super({ name: 'motor', port, baudRate: 57600 })
        this.state = 'stopped'
    }
    backward() {
        this.send('B')
    }
    forward() {
        this.send('F')
    }
    receive(data) {
        // Set our state when the motor updates its state
        this.state = data
    }
    stop() {
        this.send('S')
    }
}
```

Another example would be a power controller that sends a number representing which button has been pressed:

(File `power_control.js`)

```javascript
const SerialDevice = require('@ami/serial').Device

class PowerControl extends SerialDevice {
    constructor(port) {
        super({ name: 'powerControls', port })
    }
    receive(data) {
        let buttons = {0: 'power', 1: 'standby', 2: 'aux'}
        this.emit(buttons[data])
    }
}

module.exports = PowerControl
```

(File `index.js`)

```javascript
const PowerControls = require('./power_control.js')

PowerControls.on('power', () => {
    console.log('Power button pressed')
})

PowerControls.on('aux', () => {
    console.log('Aux button pressed')
})
```

API Documentation
-----------------

### `new Device(name, port, baudRate?, reconnectInterval?, autoConnect?)`

Constructor

  * `name`: Human-readable identifier for logging/errors
  * `port`: Qualified path on MacOS/Linux (`/dev/some/device/path`) or COM port on Windows (`COM3`)
  * `baudRate`: Baud rate used for communication (default: `115200`)
  * `reconnectInterval`: Seconds until reconnect attempt after disconnect or error (default: `3`)
  * `autoConnect`: Automatically connect on instantiation (default `true`). If you set this to `false`, you'll need to manually call `connect()` at a later time.

### `Device.connect()`

Connect to Serial device described in constructors args.

### `Device.receive(data)`

Override in child classes. Automatically called when a new line of serial data is received for this device.

  * `data`: Incoming string

### `Device.send(data)`

Send serial data to device.

  * `data`: Outgoing string

Development & Tests
-------------------

1. Clone repo: `git clone <repo_url>`
2. Install dependencies: `npm install`
3. Run test suite: `npm test`
