'use strict'

const IPFS = require('ipfs-daemon/src/ipfs-browser-daemon')
const Log = require('../../src/log-utils')

const ipfs = new IPFS({ IpfsDataDir: '/ipfs-log/examples/index'})

ipfs.on('error', (e) => console.error(e))

ipfs.on('ready', () => {
  const outputElm = document.getElementById('output')

  // When IPFS is ready, add some log entries
  let log = Log.create('example')
  Log.append(ipfs, log, 'one')
    .then((res) => {
      log = res
      const items = JSON.stringify(log.items, null, 2)
      console.log('\n', items)
      outputElm.innerHTML += items + '<br><br>'
      return Log.append(ipfs, log, { two: 'hello' })
    })
    .then((res) => {
      log = res
      const items = JSON.stringify(log.items, null, 2)
      console.log('\n', items)
      outputElm.innerHTML += items + '<br><br>'
    })
})
