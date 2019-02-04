const EventEmitter = require('events')
const { describe, it } = require('mocha')
const chai = require('chai')
const spies = require('chai-spies')
const asPromised = require('chai-as-promised')
chai.use(spies)
chai.use(asPromised)
const { expect, spy } = require('chai')
const proxyquire = require('proxyquire')

class MockSerialPort extends EventEmitter {
    constructor() {
        super()
        setTimeout(this.emit.bind(this, 'open'), 20)
    }
    pipe() {
        return this
    }
    write() {}
}
const { Device } = proxyquire('.', { 'serialport': MockSerialPort })

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

describe('Wrapper', () => {
    it('should connect on instantiation', async() => {
        let initFunc = spy.on(Device.prototype, 'init')
        new Device({ name: 'test', port: '/dev/null' })
        await delay(30)
        expect(initFunc).to.have.been.called
        spy.restore(Device.prototype, 'init')
    })
    it('should reconnect on close', async() => {
        let initFunc = spy.on(Device.prototype, 'init')
        let device = new Device({ name: 'test', port: '/dev/null' })
        // 30 ms reconnect
        device.reconnectInterval = .003
        await delay(30)
        device.serial.emit('close')
        await delay(60)
        expect(initFunc).to.have.been.called.twice
        spy.restore(Device.prototype, 'init')
    })
    it('should reconnect on error', async() => {
        let initFunc = spy.on(Device.prototype, 'init')
        let device = new Device({ name: 'test', port: '/dev/null' })
        // 30 ms reconnect
        device.reconnectInterval = .003
        await delay(30)
        device.serial.emit('error', 'broken!')
        await delay(60)
        expect(initFunc).to.have.been.called.twice
        spy.restore(Device.prototype, 'init')
    })
    it('should receive data', async() => {
        let receiveFunc = spy.on(Device.prototype, 'receive')
        let device = new Device({ name: 'test', port: '/dev/null' })
        device.serial.emit('data', 'a message')
        expect(receiveFunc).to.have.been.called.with('a message')
        spy.restore(Device.prototype, 'receive')
    })
    it('should send data', async() => {
        let device = new Device({ name: 'test', port: '/dev/null' })
        let writeFunc = spy.on(MockSerialPort.prototype, 'write')
        device.send('outbound!')
        expect(writeFunc).to.have.been.called.with('outbound!')
    })
})