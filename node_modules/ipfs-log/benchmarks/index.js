'use strict'

const Benchmark = require('benchmark')
// const IPFS = require('ipfs-daemon')
const IPFS = require('ipfs-daemon/src/ipfs-node-daemon')
const Log = require('../src/log-utils')
const pWhilst = require('p-whilst')

const suite = new Benchmark.Suite('ipfs-log')

let ipfs = new IPFS({
  Flags: [],
  Bootstrap: []
})

ipfs.on('error', (err) => {
  console.error(err)
  process.exit(1)
})

let log1
let log2
let log2000
let i = 0

suite.add('append', (d) => {
  Log.append(ipfs, log1, (i++).toString())
    .then((res) => d.resolve())
    .catch((e) => console.error(e))
}, {
  minSamples: 100,
  defer: true
})

suite.add('join', (d) => {
  i++

  Promise.all([
    Log.append(ipfs, log1, 'a' + i),
    Log.append(ipfs, log2, 'b' + i)
  ])
    .then((res) => {
      log1 = Log.join(res[0], res[1], 60)
      log2 = Log.join(res[1], res[0], 60)
      d.resolve()
    })
    .catch((e) => console.error(e))
}, {
  minSamples: 100,
  defer: true
})

suite.add('expand', (d) => {
  Log.expand(ipfs, log2000, 1)
    .then((res) => {
      log2000 = res
      d.resolve()
    })
    .catch((e) => console.error(e))
}, {
  minSamples: 100,
  defer: true
})

ipfs.on('ready', () => {
  log1 = Log.create('A')
  log2 = Log.create('B')
  log2000 = Log.create('THOUSANDS')

  let values = []
  for (let i = 0; i < 2000; i++) {
    values.push(i)
  }

  let i = 0
  console.log('Generating a log of 2000 entries...')
  pWhilst(
    () => i < 2000,
    () => {
      return Log.append(ipfs, log2000, 'a' + i)
        .then((log) => {
          log2000 = log
          i++
          return log2000
        })
    }
  )
  .then(() => {
    // Set the size of the expandable log to 1
    return Log.fromEntry(ipfs, [log2000.items[log2000.items.length - 1]], 1)
      .then((log) => log2000 = log)
  })
  .then(() => {
    console.log('Running benchmarks...')
    suite
      .on('cycle', (event) => {
        log1 = Log.create('A')
        log2 = Log.create('B')
        i = 0
        console.log(String(event.target))
      })
      .on('complete', () => {
        ipfs.stop()
        process.exit(0)
      })
      .run({
        async: true
      })
  })
  .catch(e => console.error(e))
})
