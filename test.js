const SerialPort = require('serialport')
const TestSerialPort = require('serialport/test')
const MockBinding = TestSerialPort.Binding
jest.mock('serialport')
SerialPort.mockImplementation(TestSerialPort)

const { Device } = require('.')

const portOne = '/dev/ttyS0fake'
MockBinding.createPort(portOne, { echo: false, record: true })
const delay = (ms) => new Promise((res) => setTimeout(res, ms))


describe('Connection Handling', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })
    it('should automatically connect on instantiation', async() => {
        let connectFunc = jest.spyOn(Device.prototype, 'connect')
        const device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake' })
        await delay(30)
        expect(connectFunc).toHaveBeenCalled()
        device.close()
    })
    it('should allow manual connection if desired', () => {
        let device
        const start = () => { device = new Device({ name: 'fakeDevice', autoConnect: false }) }
        expect(start).not.toThrow(Error)
        device.close()
    })
    it('should reconnect on abnormal close', async() => {
        let device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake', autoConnect: false })
        let initFunc = jest.spyOn(device, 'init')
        // 30 ms reconnect
        device.reconnectInterval = .03
        await device.connect()
        // Simulate disconnect
        device.serial._disconnected({})
        await delay(40)
        expect(initFunc).toHaveBeenCalledTimes(2)
        device.close()
    })
    it('should reconnect if connection failed', async() => {
        //jest.resetAllMocks() 
        let connectFunc = jest.spyOn(Device.prototype, 'connect')
        let device = new Device({ name: 'fakeDevice', port: '/dev/ttyNonExistent' })
        // 30 ms reconnect
        device.reconnectInterval = .03
        await delay(60)
        expect(connectFunc).toHaveBeenCalledTimes(2)
        device.close()
    })
    it('should emit a connect event when connected', async() => {
        let device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake' })
        const someFunc = () => {}
        let runMe = jest.fn()
        device.on('connect', runMe)
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
    afterEach(() => {
        device.close()
    })
    it('should receive data', async() => {
        let receiveFunc = jest.spyOn(device, 'receive')
        await device.connect()
        device.serial.binding.emitData(Buffer.from('a message\nsecond'))
        await delay(30)
        expect(receiveFunc).toHaveBeenCalledWith('a message')
    })
    it('should not receive data twice after a reconnection', async() => {
        let receiveFunc = jest.spyOn(device, 'receive')
        await device.connect()
        await device.close()
        await device.connect()
        device.serial.binding.emitData(Buffer.from('another\n'))
        await delay(30)
        expect(receiveFunc).toHaveBeenCalledTimes(1)
    })
    it('should send data', async() => {
        await device.connect()
        let writeFunc = jest.spyOn(device.serial, 'write')
        device.send('outbound!')
        await delay(5)
        expect(writeFunc).toHaveBeenCalledWith('outbound!', expect.any(Function))
    })
    it('should inform user if data could not be sent', async() => {
        let error = jest.spyOn(console, 'error')
        await device.connect()
        let writeFunc = jest.spyOn(device.serial, 'write')
        device.send('this send should fail')
        device.close()
        await delay(5)
        expect(error).toHaveBeenCalledWith(expect.stringMatching(/Error sending/))
    })
})

describe('Parsing', () => {
    it('should allow passing of custom parsers', async() => {
        const FakeParser = {
            emit: () => {},
            on: () => {},
            once: () => {}
        }
        let device = new Device({ name: 'fakeDevice', port: '/dev/ttyS0fake', parser: FakeParser, autoConnect: false })
        let pipeFunc = jest.spyOn(TestSerialPort.prototype, 'pipe')
        await device.connect()
        expect(pipeFunc).toHaveBeenCalledWith(FakeParser)
    })
})