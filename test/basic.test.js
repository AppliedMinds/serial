import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { SerialPortMock } from 'serialport'

// Mock Serial Port
const portOne = '/dev/ttyS0fake'
SerialPortMock.binding.createPort(portOne, { echo: false, record: true })
mock.module('serialport', {
    namedExports: { SerialPort: SerialPortMock }
})

const { Device } = await import('../index.js')

describe('Connection Handling', () => {
    it('should automatically connect on instantiation', async() => {
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake' })
        const fn = mock.fn()
        device.on('connect', fn)
        await delay(30)
        assert.equal(fn.mock.calls.length, 1)
        device.close()
    })
    it('should allow manual connection if desired', () => {
        let device
        const start = () => {
            device = new Device({ name: 'fakeDevice', autoConnect: false })
        }
        assert.doesNotThrow(start)
        device.close()
    })
    it('should reconnect on abnormal close', async() => {
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake', autoConnect: false })
        const initFunc = mock.method(device, 'init')
        // 30 ms reconnect
        device.reconnectInterval = 0.03
        await device.connect()
        // Simulate disconnect
        device.serial._disconnected({})
        await delay(40)
        assert.equal(initFunc.mock.calls.length, 2)
        device.close()
    })
    it('should reconnect if connection failed', async() => {
        const connectFn = mock.method(Device.prototype, 'connect')
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyNonExistent' })
        // 30 ms reconnect
        device.reconnectInterval = 0.03
        await delay(60)
        assert.equal(connectFn.mock.calls.length, 2)
        device.close()
    })
    it('should emit a connect event when connected', async() => {
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake' })
        const fn = mock.fn()
        device.on('connect', fn)
        await delay(10)
        assert(fn.mock.calls.length > 0)
        device.close()
    })
    it('should emit a close event on regular disconnect', async() => {
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake' })
        const fn = mock.fn()
        device.on('close', fn)
        await delay(10)
        await device.close()
        assert(fn.mock.calls.length > 0)
    })
    it('should emit a close event on abnormal disconnect', async() => {
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake' })
        const fn = mock.fn()
        device.on('close', fn)
        await delay(10)
        // Simulate disconnect
        device.serial._disconnected({})
        // Wait slightly to let events propagate
        await delay(10)
        assert(fn.mock.calls.length > 0)
        device.close()
    })
})

describe('Input/Output', () => {
    let device
    beforeEach(() => {
        device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake', autoConnect: false })
    })
    afterEach(() => device.close())
    it('should receive data', async() => {
        const receiveFunc = mock.fn()
        device.on('data', receiveFunc)
        await device.connect()
        device.serial.port.emitData(Buffer.from('a message\nsecond'))
        await delay(30)
        assert.equal(receiveFunc.mock.calls[0].arguments[0], 'a message')
    })
    it('should not receive data twice after a reconnection', async() => {
        const receiveFunc = mock.fn()
        device.on('data', receiveFunc)
        await device.connect()
        await device.close()
        await device.connect()
        device.serial.port.emitData(Buffer.from('another\n'))
        await delay(30)
        assert.equal(receiveFunc.mock.calls.length, 1)
    })
    it('should send data', async() => {
        await device.connect()
        const writeFunc = mock.method(device.serial, 'write')
        await device.send('outbound!')
        assert.equal(writeFunc.mock.calls[0].arguments[0], 'outbound!')
    })
    it('should inform user if data could not be sent', async() => {
        await device.connect()
        const response = device.send('this send should fail')
        device.close()
        await assert.rejects(response, /Error sending/i)
    })
})

describe('Parsing', () => {
    it('should allow passing of custom parsers', async() => {
        const FakeParser = {
            emit: () => {},
            on: () => {},
            once: () => {}
        }
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake', parser: FakeParser, autoConnect: false })
        const pipeFunc = mock.method(SerialPortMock.prototype, 'pipe')
        await device.connect()
        assert.equal(pipeFunc.mock.calls[0].arguments[0], FakeParser)
    })
})