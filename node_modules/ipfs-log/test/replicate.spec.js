'use strict'

const async = require('asyncawait/async')
const await = require('asyncawait/await')
const assert = require('assert')
const rmrf = require('rimraf')
const apis = require('./config/test-apis')
const config = require('./config/ipfs-daemon.config')
const Log = require('../src/log-utils.js')

const channel = 'XXX'

// Shared database name
const waitForPeers = (ipfs, channel) => {
  return new Promise((resolve, reject) => {
    console.log("Waiting for peers...")
    const interval = setInterval(() => {
      ipfs.pubsub.peers(channel)
        .then((peers) => {
          if (peers.length > 0) {
            console.log("Found peers, running tests...")
            clearInterval(interval)
            resolve()
          }
        })
        .catch(reject)
    }, 1000)
  })
}

// HACK: run replication tests only with node.js api
// until js-ipfs-api supports pubsub
apis.filter((e, idx) => idx === 0).forEach((IpfsDaemon) => {

  describe('ipfs-log - Replication', function() {
    this.timeout(80000)

    let ipfs1, ipfs2, client1, client2, db1, db2

    before(function (done) {
      ipfs1 = new IpfsDaemon(config.daemon1)
      ipfs1.on('error', done)
      ipfs1.on('ready', () => {
        ipfs2 = new IpfsDaemon(config.daemon2)
        ipfs2.on('error', done)
        ipfs2.on('ready', () => {
          done()
        })
      })
    })

    after(() => {
      if (ipfs1) ipfs1.stop()
      if (ipfs2) ipfs2.stop()
    })

    describe('replicates logs deterministically', function() {
      const amount = 100

      let log1, log2, input1, input2
      let buffer1 = []
      let buffer2 = []
      let processing = 0

      const processMessage = async((message, ipfs, buffer, log) => {
        if (ipfs.PeerId === message.from)
          return
        buffer.push(message.data.toString())
        processing ++
        const exclude = log.values.map((e) => e.hash)
        process.stdout.write('\r')
        process.stdout.write(`Buffer1: ${buffer1.length} - Buffer2: ${buffer2.length}`)
        const tmp = await(Log.fromMultihash(ipfs, message.data.toString(), -1, exclude))
        log = Log.join(log, tmp, -1, log.id)
        processing --
      })

      const handleMessage = async((message) => {
        if (ipfs1.PeerId === message.from)
          return
        buffer1.push(message.data.toString())
        processing ++
        const exclude = log1.values.map((e) => e.hash)
        process.stdout.write('\r')
        process.stdout.write(`Buffer1: ${buffer1.length} - Buffer2: ${buffer2.length}`)
        const log = await(Log.fromMultihash(ipfs1, message.data.toString()))
        log1 = Log.join(log1, log, -1, log1.id)
        processing --
      })

      const handleMessage2 = async((message) => {
        if (ipfs2.PeerId === message.from)
          return
        buffer2.push(message.data.toString())
        processing ++
        process.stdout.write('\r')
        process.stdout.write(`Buffer1: ${buffer1.length} - Buffer2: ${buffer2.length}`)
        const exclude = log2.values.map((e) => e.hash)
        const log = await(Log.fromMultihash(ipfs2, message.data.toString()))
        log2 = Log.join(log2, log, -1, log2.id)
        processing --
      })

      beforeEach(async(() => {
        log1 = Log.create('A')
        log2 = Log.create('B')
        input1 = Log.create('input1')
        input2 = Log.create('input2')
        await(ipfs1.pubsub.subscribe(channel, handleMessage))
        await(ipfs2.pubsub.subscribe(channel, handleMessage2))
      }))

      it('replicates logs', (done) => {
        waitForPeers(ipfs1, channel)
          .then(async(() => {
            for(let i = 1; i <= amount; i ++) {
              input1 = await(Log.append(ipfs1, input1, "A" + i))
              input2 = await(Log.append(ipfs2, input2, "B" + i))
              const mh1 = await(Log.toMultihash(ipfs1, input1))
              const mh2 = await(Log.toMultihash(ipfs2, input2))
              await(ipfs1.pubsub.publish(channel, new Buffer(mh1)))
              await(ipfs2.pubsub.publish(channel, new Buffer(mh2)))
            }

            console.log("\nAll messages sent")

            const whileProcessingMessages = (timeoutMs) => {
              return new Promise((resolve, reject) => {
                setTimeout(() => reject('timeout'), timeoutMs)
                const timer = setInterval(() => {
                  if (buffer1.length + buffer2.length === amount * 2
                      && processing === 0) {
                    console.log("\nAll messages received")
                    clearInterval(timer)
                    resolve()
                  }
                }, 1000)
              })
            }

            console.log("Waiting for all to process")
            try {
              const timeout = 30000
              await(whileProcessingMessages(timeout))

              const result = Log.join(log1, log2)

              assert.equal(buffer1.length, amount)
              assert.equal(buffer2.length, amount)
              assert.equal(result.length, amount * 2)
              assert.equal(log1.length, amount)
              assert.equal(log2.length, amount)
              assert.equal(result.values[0].payload, 'A1')
              assert.equal(result.values[1].payload, 'B1')
              assert.equal(result.values[2].payload, 'A2')
              assert.equal(result.values[3].payload, 'B2')
              assert.equal(result.values[99].payload, 'B50')
              assert.equal(result.values[100].payload, 'A51')
              assert.equal(result.values[198].payload, 'A100')
              assert.equal(result.values[199].payload, 'B100')
              done()
            } catch(e) {
              done(e)
            }

          }))
          .catch(done)
      })
    })
  })
})
