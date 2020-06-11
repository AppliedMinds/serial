const EventEmitter = require('events')
const SerialPort = require('serialport')
const ReadLine = require('@serialport/parser-readline')

class Device extends EventEmitter {
    constructor({ name, port, baudRate=115200, reconnectInterval=3, autoConnect=true, parser=null }) {
        super()
        this.name = name
        this.port = port
        this.baudRate = baudRate
        this.parser = parser ? parser : new ReadLine()
        // Seconds to reconnect
        this.reconnectInterval = reconnectInterval
        if (autoConnect) this.connect()
    }
    connect() {
        return new Promise(res => {
            this.serial = new SerialPort(this.port, { baudRate: this.baudRate })
            this.serial.on('close', this.closed.bind(this))
            this.serial.on('error', this.error.bind(this))
            this.serial.on('open', () => {
                res()
                this.init()
            })
        })
    }
    init() {
        this._dataStream = this.serial.pipe(this.parser)
        this._dataStream.on('data', this.emit.bind(this, 'data'))
        console.info(`Connected to device ${this.name} at ${this.port}.`)
        this.emit('connect')
    }
    error(error) {
        console.error(`Problem with ${this.name}: ${error}. Attemping reconnect in ${this.reconnectInterval} seconds...`)
        clearTimeout(this._reconnectTimer)
        this._reconnectTimer = setTimeout(this.connect.bind(this), this.reconnectInterval * 1000)
    }
    close() {
        clearTimeout(this._reconnectTimer)
        if (this.serial && this.serial.isOpen) return new Promise(res => this.serial.close(res))
        return Promise.resolve()
    }
    closed(error) {
        clearTimeout(this._reconnectTimer)
        this._dataStream.removeAllListeners()
        if (error && error.disconnected) {
            console.warn(`${this.name} at ${this.port} disconnected. Attemping reconnect in ${this.reconnectInterval} seconds...`)
            this._reconnectTimer = setTimeout(this.connect.bind(this), this.reconnectInterval * 1000)
        }
    }
    async send(data) {
        return new Promise((res, rej) => {
            this.serial.write(data, err => {
                if (err) {
                    return rej(`Error sending data '${data}': ${err}`)
                }
                res(true)
            })
        })
    }
}

module.exports = { Device }
