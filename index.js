const EventEmitter = require('events')
const SerialPort = require('serialport')

class Device extends EventEmitter {
    constructor({ name, port, baudRate=115200, reconnectInterval=3 }) {
        super()
        this.name = name
        this.port = port
        this.baudRate = baudRate
        // Seconds to reconnect
        this.reconnectInterval = reconnectInterval
        this.connect()
    }
    connect() {
        this.serial = new SerialPort(this.port, { baudRate: this.baudRate })
        this.serial.on('close', this.close.bind(this))
        this.serial.on('error', this.error.bind(this))
        this.serial.on('open', this.init.bind(this))
        this.serial.pipe(new SerialPort.parsers.Readline()).on('data', this.receive.bind(this))
    }
    init() {
        console.info(`Connected to device ${this.name} at ${this.port}.`)
    }
    error(error) {
        console.error(`Problem with ${this.name}: ${error}. Attemping reconnect in ${this.reconnectInterval} seconds...`)
        setTimeout(this.connect.bind(this), this.reconnectInterval * 1000)
    }
    close() {
        console.warn(`${this.name} at ${this.port} disconnected. Attemping reconnect in ${this.reconnectInterval} seconds...`)
        setTimeout(this.connect.bind(this), this.reconnectInterval * 1000)
    }
    receive(data) {
        if (data == 'Initialized!') console.info('Device Initialized!')
    }
    send(data) {
        this.serial.write(data, err => {
            if (err) console.error(`Error sending data '${data}': ${err}`)
        })
    }
}

module.exports = { Device }
