# ipfs-log

[![npm version](https://badge.fury.io/js/ipfs-log.svg)](https://badge.fury.io/js/ipfs-log)
[![CircleCI Status](https://circleci.com/gh/haadcode/ipfs-log.svg?style=shield)](https://circleci.com/gh/haadcode/ipfs-log)
[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)

> An append-only log on IPFS.

`ipfs-log` is an immutable, operation-based conflict-free replicated data structure ([CRDT](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)) for distributed systems. It's an append-only log that can be used to model a mutable, shared state between peers in p2p applications. `ipfs-log` is partially ordered, eventually consistent and persisted in [IPFS](https://github.com/ipfs/ipfs). Each entry in the log has references to the previous entries which allows history traversal.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Tests](#tests)
- [Build](#build)
- [Contribute](#contribute)
- [License](#license)

## Background

This module provides a data-agnostic transport mechanism using IPFS with the ability to traverse the history. Every entry in the log is saved in IPFS and each points to a hash of previous entry(ies) forming a graph. Logs can be forked and joined back together.

```
entry0 <-- entry1 <-- entry2 ...
```

The module works in **Node.js** and **Browsers**.

IPFS Log has a few use cases:

- CRDTs
- Database operations log
- Feed of data
- Track a version of a file
- Messaging

It was originally created for, and currently used in, [orbit-db](https://github.com/haadcode/orbit-db) - a distributed peer-to-peer database on [IPFS](https://github.com/ipfs/ipfs).

## Requirements

- Node.js v6.0.0 or newer

## Install

```
npm install ipfs-log
```

## Usage

See the [API documentation](#api) and [examples](https://github.com/haadcode/ipfs-log/tree/master/examples) for more details.

### Quick Start

Install dependencies:

```
npm install ipfs-log ipfs
```

Run a simple program:

```javascript
const IPFS = require('ipfs')
const Log  = require('ipfs-log')

const ipfs = new IPFS()
const log  = Log.create('A')

Log.append(ipfs, log, { some: 'data' })
  .then((log) => Log.append(ipfs, log, 'text'))
  .then((log) => console.log(log.values))

// [ 
//   { 
//     hash: 'QmV1KFxZnaguPFp57PMXz5Dd1tf6z9U8csJQoy4xWDzzts',
//     id: 'A',
//     payload: { some: 'data' },
//     next: [],
//     v: 0,
//     clock: LamportClock { id: 'A', time: 0 } 
//   },
//   { hash: 'QmSxe4Shd7jt4ExyoBjtvgi1UabNKrZfRJKptwUmSa843u',
//     id: 'A',
//     payload: 'text',
//     next: [ 'QmV1KFxZnaguPFp57PMXz5Dd1tf6z9U8csJQoy4xWDzzts' ],
//     v: 0,
//     clock: LamportClock { id: 'A', time: 1 } 
//   } 
// ]
```

### Node.js

See [examples](https://github.com/haadcode/ipfs-log/tree/master/examples) for details.

### Browser

See [examples/browser](https://github.com/haadcode/ipfs-log/tree/master/examples/browser) for details.

*The distribution package for browsers is located in [dist/ipfslog.min.js](https://github.com/haadcode/ipfs-log/tree/master/dist)*

#### Building the browser examples

```
npm install
npm run build
```

## API

All operations to a log are immutable, ie. each operation returns a new instance of `Log` instead of modifying the original instance. The returned `Log` instance can be queried for its properties, eg. `values`.

### Log

```javascript
const Log = require('ipfs-log')
```

##### Log.create(id)

Create a log. Each log gets a unique ID passed as an argument. Returns a `Log` instance.

```javascript
const log = Log.create('logid')
```

`id` is a unique log identifier. Usually this should be a user id or similar.

##### Log.append(ipfs, log, data)

Append an entry to the log. Returns a *Promise* that resolves to a new `Log`.

`ipfs` IPFS instance.

`log` Log to append to.

`data` can be any type of data: Number, String, Object, etc. It can also be an instance of [Entry](https://github.com/haadcode/ipfs-log/blob/master/examples/entry.js).

Appending an entry to the log will cause the new entry to be persisted in IPFS, thus causing side effects.

```javascript
Log.append(ipfs, log, { some: 'data' })
  .then((log) => Log.append(ipfs, log, 'text'))
  .then((log) => console.log(log.values))

// [ 
//   { 
//     hash: 'QmV1KFxZnaguPFp57PMXz5Dd1tf6z9U8csJQoy4xWDzzts',
//     id: 'A',
//     payload: { some: 'data' },
//     next: [],
//     v: 0,
//     clock: LamportClock { id: 'A', time: 4 } 
//   },
//   { hash: 'QmSxe4Shd7jt4ExyoBjtvgi1UabNKrZfRJKptwUmSa843u',
//     id: 'A',
//     payload: 'text',
//     next: [ 'QmV1KFxZnaguPFp57PMXz5Dd1tf6z9U8csJQoy4xWDzzts' ],
//     v: 0,
//     clock: LamportClock { id: 'A', time: 5 } 
//   } 
// ]
```

##### Log.join(log1, log2, [length], [id])

Join two logs. Returns a new `Log` instance. The size of the joined log can be specified by giving `length` argument. 

```javascript
// log1.values ==> ['A', 'B', 'C']
// log2.values ==> ['C', 'D', 'E']

Log.join(log1, log2)
  .then((log) => console.log(log.values))
// ['A', 'B', 'C', 'D', 'E']
```

Joining logs doesn't cause side effects.

##### Log.joinAll(logs, length)

Join multiple logs together. Logs to join can be given as an `Array` of `Log` instances through the `logs` argument. The size of the joined log can be specified by giving `length` argument. 

Joining logs doesn't cause side effects.

##### Log.isLog(log)

Check if an object is a `Log` instance.

##### Log.expand(ipfs, log, [amount=-1])

Expands a `log` by `amount` by retreiving more entries from the tails of the log. Returns a new `Log` instance. 

Expanding a log will retrieve new entries from IPFS, thus causing side effects.

##### Log.expandFrom(ipfs, log, entries, [amount=-1])

Expand a `log` by `amount` by retrieving more entries starting from `entries`. `entries` is an `Array` of `Entry` instances. Returns a new `Log` instance. 

Expanding a log will retrieve new entries from IPFS, thus causing side effects.

##### Log.fromEntry(ipfs, entry, [length=-1])

Create a `Log` from an `Entry`.

Creating a log from an entry will retrieve entries from IPFS, thus causing side effects.

##### Log.toMultihash(ipfs, log)

Returns the multihash of the log.

Converting the log to a multihash will persist the log to IPFS, thus causing side effects.

##### Log.fromMultihash(ipfs, multihash, [length=-1])

Create a `Log` from a multihash.

Creating a log from a multihash will retrieve entries from IPFS, thus causing side effects.

#### Properties

##### values

Returns an `Array` of values in the log. The values are in partial, linearized order according to their [Lamport clocks](https://en.wikipedia.org/wiki/Lamport_timestamps).

```javascript
const values = log.values
// TODO: output example
```

##### heads

Returns the heads of the log. Heads are the entries that are not referenced by other entries in the log.

```javascript
const tails = log.tails
// TODO: output example
```

##### tails

Return the tails of the log. Tails are the entries that reference other entries that are not in the log.

```javascript
const tails = log.tails
// TODO: output example
```

##### length

Returns the number of entries in the log.

##### id

Returns the ID of the log.

##### clock

Returns the current timestamp of the log.

##### toJSON

TODO

##### toBuffer

TODO

##### toString

Returns the log values as a nicely formatted string.

```javascript
console.log(log.toString())
// two
// └─one
//   └─three
```

## Tests

```
npm install
npm test
```

## Build

The build script will build the distribution file for browsers.
```
npm run build
```

## Benchmark

There's a benchmark suite in [benchmarks/](https://github.com/haadcode/ipfs-log/blob/master/benchmarks) that can be run with:

```
npm install
npm benchmark
```

There are also simple benchmark programs for [append](https://github.com/haadcode/ipfs-log/blob/master/examples/benchmark-append.js), [join](https://github.com/haadcode/ipfs-log/blob/master/examples/benchmark-join.js) and [expand](https://github.com/haadcode/ipfs-log/blob/master/examples/benchmark-expand.js) that can be used to measure performance over-time. 

```
npm install
node examples/benchmark-append.js
```

## Contribute

PRs and [issues](https://github.com/haadcode/ipfs-log/issues) are gladly accepted! Take a look at the open issues, too, to see if there is anything that you could do or someone else has already done. Here are some things I know I need:

### TODO

- Support for signed logs
- Support for payload encryption

## License

[MIT](LICENSE) © 2016 Haadcode
