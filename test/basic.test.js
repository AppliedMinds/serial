const SerialPort = require('serialport')
const TestSerialPort = require('serialport/test')
const MockBinding = TestSerialPort.Binding
jest.mock('serialport')
SerialPort.mockImplementation(TestSerialPort)

const { Device } = require('..')

const portOne = '/dev/ttyS0fake'
MockBinding.createPort(portOne, { echo: false, record: true })
const delay = ms => new Promise(res => setTimeout(res, ms))

describe('Connection Handling', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })
    it('should automatically connect on instantiation', async() => {
        const connectFunc = jest.spyOn(Device.prototype, 'connect')
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake' })
        await delay(30)
        expect(connectFunc).toHaveBeenCalled()
        device.close()
    })
    it('should allow manual connection if desired', () => {
        let device
        const start = () => {
            device = new Device({ name: 'fakeDevice', autoConnect: false })
        }
        expect(start).not.toThrow(Error)
        device.close()
    })
    it('should reconnect on abnormal close', async() => {
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake', autoConnect: false })
        const initFunc = jest.spyOn(device, 'init')
        // 30 ms reconnect
        device.reconnectInterval = 0.03
        await device.connect()
        // Simulate disconnect
        device.serial._disconnected({})
        await delay(40)
        expect(initFunc).toHaveBeenCalledTimes(2)
        device.close()
    })
    it('should reconnect if connection failed', async() => {
        const connectFunc = jest.spyOn(Device.prototype, 'connect')
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyNonExistent' })
        // 30 ms reconnect
        device.reconnectInterval = 0.03
        await delay(60)
        expect(connectFunc).toHaveBeenCalledTimes(2)
        device.close()
    })
    it('should emit a connect event when connected', async() => {
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake' })
        const runMe = jest.fn()
        device.on('connect', runMe)
        await delay(10)
        expect(runMe).toHaveBeenCalled()
        device.close()
    })
    it('should emit a close event on regular disconnect', async() => {
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake' })
        const runMe = jest.fn()
        device.on('close', runMe)
        await delay(10)
        await device.close()
        expect(runMe).toHaveBeenCalled()
    })
    it('should emit a close event on abnormal disconnect', async() => {
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake' })
        const runMe = jest.fn()
        device.on('close', runMe)
        await delay(10)
        // Simulate disconnect
        device.serial._disconnected({})
        // Wait slightly to let events propagate
        await delay(10)
        expect(runMe).toHaveBeenCalled()
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
        const receiveFunc = jest.fn()
        device.on('data', receiveFunc)
        await device.connect()
        device.serial.binding.emitData(Buffer.from('a message\nsecond'))
        await delay(30)
        expect(receiveFunc).toHaveBeenCalledWith('a message')
    })
    it('should not receive data twice after a reconnection', async() => {
        const receiveFunc = jest.fn()
        device.on('data', receiveFunc)
        await device.connect()
        await device.close()
        await device.connect()
        device.serial.binding.emitData(Buffer.from('another\n'))
        await delay(30)
        expect(receiveFunc).toHaveBeenCalledTimes(1)
    })
    it('should send data', async() => {
        await device.connect()
        const writeFunc = jest.spyOn(device.serial, 'write')
        await device.send('outbound!')
        expect(writeFunc).toHaveBeenCalledWith('outbound!', expect.any(Function))
    })
    it('should inform user if data could not be sent', async() => {
        await device.connect()
        const response = device.send('this send should fail')
        device.close()
        await expect(response).rejects.toEqual(expect.stringMatching(/Error sending/))
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
        const pipeFunc = jest.spyOn(TestSerialPort.prototype, 'pipe')
        await device.connect()
        expect(pipeFunc).toHaveBeenCalledWith(FakeParser)
    })
})