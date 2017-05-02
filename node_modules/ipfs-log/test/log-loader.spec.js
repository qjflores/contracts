'use strict'

const assert = require('assert')
const async = require('asyncawait/async')
const await = require('asyncawait/await')
const rmrf = require('rimraf')
const apis = require('./config/test-apis')
const Log = require('../src/log-utils')
const LogLoader = require('../src/log-loader')

const dataDir = './ipfs'

let ipfs, ipfsDaemon

const last = (arr) => {
  return arr[arr.length - 1]
}

apis.forEach((IpfsDaemon) => {

  describe('Fetch', function() {
    this.timeout(60000)

    before((done) => {
      rmrf.sync(dataDir)
      ipfs = new IpfsDaemon({ IpfsDataDir: dataDir })
      ipfs.on('error', done)
      ipfs.on('ready', () => done())
    })

    after(() => {
      ipfs.stop()
      rmrf.sync(dataDir)
    })

    it('log with one entry', async(() => {
      let log = Log.create('A')
      log = await(Log.append(ipfs, log, 'one'))
      const hash = log.values[0].hash
      const res = await(LogLoader.fetchAll(ipfs, hash, 1))
      assert.equal(res.length, 1)
    }))

    it('log with 2 entries', async(() => {
      let log = Log.create('A')
      log = await(Log.append(ipfs, log, 'one'))
      log = await(Log.append(ipfs, log, 'two'))
      const hash = last(log.values).hash
      const res = await(LogLoader.fetchAll(ipfs, hash, 2))
      assert.equal(res.length, 2)
    }))

    it('loads max 1 entriy from a log of 2 entry', async(() => {
      let log = Log.create('A')
      log = await(Log.append(ipfs, log, 'one'))
      log = await(Log.append(ipfs, log, 'two'))
      const hash = last(log.values).hash
      const res = await(LogLoader.fetchAll(ipfs, hash, 1))
      assert.equal(res.length, 1)
    }))

    it('log with 100 entries', async(() => {
      const count = 100
      let log = Log.create('A')
      for (let i = 0; i < count; i ++)
        log = await(Log.append(ipfs, log, 'hello' + i))

      const hash = await(Log.toMultihash(ipfs, log))
      const result = await(Log.fromMultihash(ipfs, hash))
      assert.equal(result.length, count)
    }))

    it('load only 42 entries from a log with 100 entries', async(() => {
      const count = 100
      let log = Log.create('a')
      let log2 = Log.create('b')
      for (let i = 1; i <= count; i ++) {
        log = await(Log.append(ipfs, log, 'hello' + i))
        if (i % 10 === 0) {
          log2 = Log.create(log2.id, log2.values, log2.heads.concat(log.heads))
          log2 = await(Log.append(ipfs, log2, 'hi' + i))
        }
      }

      const hash = await(Log.toMultihash(ipfs, log))
      const result = await(Log.fromMultihash(ipfs, hash, 42))
      assert.equal(result.length, 42)        
    }))

    it('load only 99 entries from a log with 100 entries', async(() => {
      const count = 100
      let log = Log.create('A')
      let log2 = Log.create('B')
      let log3 = Log.create('C')
      for (let i = 1; i <= count; i ++) {
        log = await(Log.append(ipfs, log, 'hello' + i))
        if (i % 10 === 0) {
          log2 = Log.create(log2.id, log2.values)
          log2 = await(Log.append(ipfs, log2, 'hi' + i))
          log2 = Log.join(log, log2)
        }
      }

      const hash = await(Log.toMultihash(ipfs, log2))
      const result = await(Log.fromMultihash(ipfs, hash, 99))
      assert.equal(result.length, 99)
    }))

    it('load only 10 entries from a log with 100 entries', async(() => {
      const count = 100
      let log = Log.create('A')
      let log2 = Log.create('B')
      let log3 = Log.create('C')
      for (let i = 1; i <= count; i ++) {
        log = await(Log.append(ipfs, log, 'hello' + i))
        if (i % 10 === 0) {
          log2 = Log.create(log2.id, log2.values, log2.heads)
          log2 = await(Log.append(ipfs, log2, 'hi' + i))
          log2 = Log.join(log, log2)
        }
        if (i % 25 === 0) {
          log3 = Log.create(log3.id, log3.values, log3.heads.concat(log2.heads))
          log3 = await(Log.append(ipfs, log3, '--' + i))
        }
      }

      log3 = Log.join(log3, log2)
      const hash = await(Log.toMultihash(ipfs, log3))
      const result = await(Log.fromMultihash(ipfs, hash, 10))
      assert.equal(result.length, 10)
    }))

    it('load only 10 entries and then expand to max from a log with 100 entries', async(() => {
      const count = 30
      let log = Log.create('A')
      let log2 = Log.create('B')
      let log3 = Log.create('C')
      for (let i = 1; i <= count; i ++) {
        log = await(Log.append(ipfs, log, 'hello' + i))
        if (i % 10 === 0) {
          log2 = await(Log.append(ipfs, log2, 'hi' + i))
          log2 = Log.join(log, log2, -1, log2.id)
        }
        if (i % 25 === 0) {
          log3 = Log.create(log3.id, log3.values, log3.heads.concat(log2.heads))
          log3 = await(Log.append(ipfs, log3, '--' + i))
        }
      }

      log3 = Log.join(log3, log2)

      const log4 = Log.join(log2, log3)

      const values3 = log3.values.map((e) => e.payload)
      const values4 = log4.values.map((e) => e.payload)

      assert.deepEqual(values3, values4)
    }))
  })
})
