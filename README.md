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

Development & Tests
-------------------

1. Clone repo: `git clone <repo_url>`
2. Install dependencies: `npm install`
3. Run test suite: `npm test`
