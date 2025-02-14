Serial
======

![tests](https://github.com/appliedminds/serial/actions/workflows/main.yml/badge.svg)

Convenience wrapper on top of [`serialport`](https://www.npmjs.com/package/serialport) for Node.js, providing the following features:

 * Automatic connection healing
 * Connection naming
 * Easy event management
 * Asynchronous send methods

##### Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Examples](#usage--examples)
- [API Docs](#api-docs)
- [License](#license)

Requirements
------------

 * Node 20+

Installation
------------

```shell
npm install @appliedminds/serial
```

Usage / Examples
----------------

Create a new `Device` for any piece of hardware that uses serial to communicate.

For example, imagine a motor board that uses `F`, `B` or `S` to send forward, back or stop commands, respectively:

```javascript
import { Device as SerialDevice } from '@appliedminds/serial'

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
        // Cache state when the device relays its state
        this.state = data
    }
    stop() {
        this.device.send('S')
    }
}

const myMotor = new Motor('COM3')
myMotor.forward()
```

Another example would be a power controller that sends a number representing which button has been pressed:


```javascript
import EventEmitter from 'node:events'
import SerialDevice from '@appliedminds/serial'

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

const powerControls = new PowerControls('/dev/cu.usbmodem1337')

powerControls.on('power', () => {
    console.log('Power button pressed')
})

powerControls.on('aux', () => {
    console.log('Aux button pressed')
})
```

API Docs
--------

### `new Device({ name : String, port : String, baudRate? : Number, reconnectInterval? : Number, autoConnect? : Boolean, parser? : Transform })`

Constructor

  * `name`: Human-readable identifier for logging/errors
  * `port`: Qualified path on MacOS/Linux (`/dev/some/device/path`) or COM port on Windows (`COM3`)
  * `baudRate`: Baud rate used for communication (default: `115200`)
  * `reconnectInterval`: Seconds until reconnect attempt after disconnect or error (default: `3`)
  * `autoConnect`: Automatically connect on instantiation (default `true`). If you set this to `false`, you'll need to manually call `connect()` at a later time.
  * `parser`: Which parser to use for incoming data (defaults to [`@serialport/parser-readline`, a parser that splits on newlines](https://serialport.io/docs/api-parser-readline)). Other parsers can be found at [@serialport](https://serialport.io/docs/#parsers), or you can write your own [Stream.Transform](https://nodejs.org/api/stream.html#stream_class_stream_transform). Set to `null` to skip parsing altogether and output raw `Buffer`s.

### Event: `'close'`

Emitted when a connection is closed, either expected or unexpectedly

### Event: `'connect'`

Emitted when a successful connection has been made.

### Event: '`data`'

Emitted with a `Buffer` when data is received for this device. If no `parser` is specified, this will be called once per line.

### `device.close()` : `<Promise>`

Manually close connection. Resolves once the connection has been closed.

### `device.connect()` : `<Promise>`

Connect to device. The returned promise will resolve once connected.

### `device.send(data : Buffer/String)` : `<Promise>`

Send serial data to device. Resolves once data is sent.

  * `data`: Outgoing Buffer or string

Contributing & Tests
--------------------

1. Install development dependencies: `npm install`
2. Run test suite: `npm test`

License
-------

MIT
