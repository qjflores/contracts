'use strict'

const IPFS = require('ipfs-daemon/src/ipfs-node-daemon')
const Log = require('../src/log')

const ipfs = new IPFS()

ipfs.on('error', (err) => console.error(err))
ipfs.on('ready', () => {
  let log1 = Log.create('A')
  let log2 = Log.create('A')

  Log.append(ipfs, log1, 'one')
    .then((log) => {
      log1 = log
      console.log(log1.items)
      // [ { hash: 'QmUrqiypsLPAWN24Y3gHarmDTgvW97bTUiXnqN53ySXM9V',
      //     payload: 'one',
      //     next: [] } ]
    })
    .then(() => Log.append(ipfs, log1, 'two'))
    .then((log) => {
      log1 = log
      return Log.append(ipfs, log2, 'three')
    })
    .then((log) => {
      log2 = log
      // Join the logs
      const log3 = Log.join(log1, log2)
      console.log(log3.toString())
      // two
      // └─one
      // three
      process.exit(0)
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
})
