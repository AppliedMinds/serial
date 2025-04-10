import { EventEmitter } from 'node:events'
import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'

export class Device extends EventEmitter {
    constructor({ name, port, baudRate = 115200, reconnectInterval = 3, autoConnect = true, parser = new ReadlineParser() }) {
        super()
        this.name = name
        this.port = port
        this.baudRate = baudRate
        this.parser = parser
        // Seconds to reconnect
        this.reconnectInterval = reconnectInterval
        if (autoConnect) this.connect()
    }
    connect() {
        return new Promise(res => {
            this.serial = new SerialPort({ baudRate: this.baudRate, path: this.port })
            this.serial.on('close', this.closed.bind(this))
            this.serial.on('error', this.error.bind(this))
            this.serial.on('open', () => {
                res()
                this.init()
            })
        })
    }
    init() {
        this._dataStream = this.parser ? this.serial.pipe(this.parser) : this.serial
        this._dataStream.on('data', this.emit.bind(this, 'data'))
        console.info(`[${this.name}] Connected at ${this.port}.`)
        this.emit('connect')
    }
    error(error) {
        console.error(`[${this.name}] ${error.message}. Attemping reconnect in ${this.reconnectInterval} seconds...`)
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
            console.warn(`[${this.name}] Disconnected at ${this.port}. Attemping reconnect in ${this.reconnectInterval} seconds...`)
            this._reconnectTimer = setTimeout(this.connect.bind(this), this.reconnectInterval * 1000)
        }
        this.emit('close')
    }
    send(data) {
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
