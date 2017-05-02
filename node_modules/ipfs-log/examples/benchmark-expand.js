'use strict'

const Log = require('../src/log-utils')
// const IPFS = require('ipfs-daemon')
const IPFS = require('ipfs-daemon/src/ipfs-node-daemon')
const pWhilst = require('p-whilst')

// State
let ipfs
let log1 = Log.create('A')

// Metrics
let totalQueries = 0
let seconds = 0
let queriesPerSecond = 0
let lastTenSeconds = 0

const logSize = 2000

const queryLoop = () => {
  Log.expand(ipfs, log1, 1)
    .then(log => {
      log1 = log
      totalQueries++
      lastTenSeconds++
      queriesPerSecond++
      setImmediate(queryLoop)
    })
}

let run = (() => {
  console.log('Starting benchmark...')

  ipfs = new IPFS({
    Flags: [],
    Bootstrap: []
  })

  ipfs.on('error', (err) => {
    console.error(err)
    process.exit(1)
  })

  ipfs.on('ready', () => {
    const reportMetrics = () => {
      // Output metrics at 1 second interval
      setInterval(() => {
        seconds++
        if (seconds % 10 === 0) {
          console.log(`--> Average of ${lastTenSeconds / 10} q/s in the last 10 seconds`)
          if (lastTenSeconds === 0) throw new Error('Problems!')
          lastTenSeconds = 0
        }
        console.log(`${queriesPerSecond} queries per second, ${totalQueries} queries in ${seconds} seconds. log1.items.length: ${log1.items.length}`)
        queriesPerSecond = 0
      }, 1000)
    }

    let values = []
    for (let i = 0; i < logSize; i++) {
      values.push(i)
    }

    let i = 0
    console.log('Generating a log')
    pWhilst(
      () => i < logSize,
      () => {
        return Log.append(ipfs, log1, 'a' + i)
          .then((log) => {
            log1 = log
            i++
            return log1
          })
      }
    )
    .then(() => {
      const last = [log1.items[log1.items.length - 1]]
      Log.fromEntry(ipfs, last, 1)
        .then((log) => {
          log1 = log
          console.log('Log generated, starting benchmark')
          reportMetrics()
          queryLoop()
        })
    })
    .catch(e => console.error(e))
  })
})()

module.exports = run
