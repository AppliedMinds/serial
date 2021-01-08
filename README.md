AMI Serial Device
=================

Easily integrate with serial-based hardware with Node.js.

Features:

 * Easy event management
 * Automatic connection healing
 * Automatic line parsing of incoming messages

Requirements
------------

### Node.js 12+

 * MacOS: `brew install node` using [Homebrew](http://brew.sh/)
 * Linux: `apt install nodejs` ([see Ubuntu/Debian specific instructions](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions)) or `pacman -S nodejs` (Arch Linux)
 * Windows: [Install](https://nodejs.org/en/download/)

Installation
------------

Ensure the local AMI registry is being used:

```shell
npm set -g @ami:registry http://npm:4873
```

Then simply install:

```shell
npm install @ami/serial
```

Usage / Examples
----------------

Create a new `Device` for any piece of hardware that uses serial to communicate.

For example, imagine a motor board that uses `F`, `B` or `S` to send forward, back or stop commands, respectively:

```javascript
const SerialDevice = require('@ami/serial').Device

class Motor {
    constructor(port) {
        this.device = new SerialDevice({ name: 'motor', port, baudRate: 57600, autoConnect: false })
        this.device.on('data', this.onReceive.bind(this))
        this.device.connect()
        this.state = 'stopped'
    }
    backward() {
        this.device.send('B')
    }
    forward() {
        this.device.send('F')
    }
    onReceive(data) {
        // Set our state when the motor updates its state
        this.state = data
    }
    stop() {
        this.device.send('S')
    }
}
```

Another example would be a power controller that sends a number representing which button has been pressed:

(File `power_control.js`)

```javascript
const EventEmitter = require('events')
const SerialDevice = require('@ami/serial').Device

class PowerControl extends EventEmitter {
    constructor(port) {
        super()
        this.device = new SerialDevice({ name: 'powerControls', port })
        this.device.on('data', this.onReceive.bind(this))
    }
    onReceive(data) {
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

API Methods
-----------

### `new Device({ name, port, baudRate?, reconnectInterval?, autoConnect?, parser? })`

Constructor

  * `name`: Human-readable identifier for logging/errors
  * `port`: Qualified path on MacOS/Linux (`/dev/some/device/path`) or COM port on Windows (`COM3`)
  * `baudRate`: Baud rate used for communication (default: `115200`)
  * `reconnectInterval`: Seconds until reconnect attempt after disconnect or error (default: `3`)
  * `autoConnect`: Automatically connect on instantiation (default `true`). If you set this to `false`, you'll need to manually call `connect()` at a later time.
  * `parser`: Which parser to use for incoming data (defaults to [`@serialport/parser-readline`, a parser that splits on newlines](https://serialport.io/docs/api-parser-readline))

### `Device.connect()` : `<Promise>`

Connect to Serial device described in constructors args. The returned promise will resolve once connected.

### `Device.send(data)` : `<Promise<Boolean>>`

Send serial data to device. Returns `false` if the send buffer is full, otherwise `true`.

  * `data`: Outgoing string

### `Device.close()` : `<Promise>`

Close connection to device. The returned promise will resolve on completion.

API Events
----------

### `connect`

Emitted when a successful connection has been made.

### `close`

Emitted when a connection is closed, either expectedly or unexpectedly

### `data`

Emitted when serial data is received for this device. If no `parser` is specified, this will be called once per line.

  * `data`: Incoming buffer

Development & Tests
-------------------

1. Clone repo: `git clone <repo_url>`
2. Install dependencies: `npm install`
3. Run test suite: `npm test`
