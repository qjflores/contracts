'use strict'

const async = require('asyncawait/async')
const await = require('asyncawait/await')
const Entry = require('../../src/entry')
const Log = require('../../src/log-utils.js')

class LogCreator {
  static createLog1 (ipfs) {
    const create = async(() => {
      let logA = Log.create('A')
      let logB = Log.create('B')
      let log = Log.create('log')
      for(let i = 1; i <= 5; i ++) {
        logA = await(Log.append(ipfs, logA, 'entryA' + i))
      }
      for(let i = 1; i <= 5; i ++) {
        logB = await(Log.append(ipfs, logB, 'entryB' + i))
      }
      let log3 = Log.join(logA, logB)
      for(let i = 6; i <= 10; i ++) {
        logA = await(Log.append(ipfs, logA, 'entryA' + i))
      }
      log = Log.join(log, log3, -1, log.id)
      log = await(Log.append(ipfs, log, 'entryC0'))
      log = Log.join(logA, log, -1, log.id)
      return log
    })

    const expectedData = [ 
      'entryA1', 'entryB1', 'entryA2', 'entryB2', 'entryA3', 'entryB3',
      'entryA4', 'entryB4', 'entryA5', 'entryB5', 
      'entryA6',
      'entryC0',
      'entryA7', 'entryA8', 'entryA9', 'entryA10',
    ]

    const log = await(create())
    return { log: log, expectedData: expectedData }
  }

  static createLog2 (ipfs) {
    const maxA = 100
    const maxB = 10
    const maxC = 3

    const create = async(() => {
      let logA = Log.create('A')
      let logB = Log.create('B')
      let log = Log.create('log')
      for(let i = 1; i <= maxA; i ++) {
        logA = await(Log.append(ipfs, logA, 'entryA' + i))
        if (maxA / i % maxB === 0)
          logA = Log.join(logA, logB)
      }
      for(let i = 1; i <= maxB; i ++) {
        logB = await(Log.append(ipfs, logB, 'entryB' + i))
      }
      
      let log3 = Log.join(logA, logB)
      
      for(let i = 1; i <= maxC; i ++) {
        logA = await(Log.append(ipfs, logA, 'entryAA' + i))
      }
      
      log = Log.join(log, log3, -1, log.id)
      log = await(Log.append(ipfs, log, 'entryC0'))
      log = Log.join(logA, log, -1, log.id)
      return log
    })

    const expectedData = [ 
    ]

    const log = await(create())
    return { log: log, expectedData: expectedData }
  }

  static createLog100 (ipfs) {
    const amount = 100

    const create = async(() => {
      let logA = Log.create('A')
      let logB = Log.create('B')
      let log = Log.create('log')
      for(let i = 1; i <= amount; i ++) {
        logA = await(Log.append(ipfs, logA, 'entryA' + i))
      }
      for(let i = 1; i <= amount; i ++) {
        logB = await(Log.append(ipfs, logB, 'entryB' + i))
      }
      log = Log.join(logA, logB)
      return log
    })

    let expectedData = []
    for(let i = 1; i <= amount; i ++) {
      expectedData.push('entryA' + i)
    }
    for(let i = 1; i <= amount; i ++) {
      expectedData.push('entryB' + i)
    }

    const log = await(create())
    return { log: log, expectedData: expectedData }
  }

  static createLog100_2 (ipfs) {
    const amount = 100

    let expectedData = []

    const create = async(() => {
      let logA = Log.create('A')
      let logB = Log.create('B')
      let log = Log.create('log')
      for(let i = 1; i <= amount; i ++) {
        logA = await(Log.append(ipfs, logA, 'entryA' + i))
        logB = Log.join(logA, logB)
        logB = await(Log.append(ipfs, logB, 'entryB' + i))
        logA = Log.join(logA, logB)
        expectedData.push('entryA' + i)
        expectedData.push('entryB' + i)
      }
      return logA
    })

    const log = await(create())
    return { log: log, expectedData: expectedData }
  }
}

module.exports = LogCreator
