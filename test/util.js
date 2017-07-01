const expect = require('expect.js');

class Util {
  constructor(web3) {
    this.web3 = web3;
    this.gasPrice = web3.toBigNumber('1');
  }

  setTimeForward(timeDiff) {
    return new Promise(function(accept, reject) {
      this.web3.currentProvider.sendAsync({
        method: "evm_increaseTime",
        params: [timeDiff],
        jsonrpc: "2.0",
        id: Date.now()
      }, function(err, result) {
        if (err) {
          reject(err);
        } else {
          accept();
        }
      });
    }.bind(this))
  }

  getGasCosts(txHash) {
    return new Promise(function(accept, reject) {
      this.web3.eth.getTransactionReceipt(txHash, function(err, tx) {
        if (err) reject(err)
        else {
          const gasCost = this.gasPrice.times(tx.gasUsed);
          accept(gasCost);
        }
      }.bind(this))
    }.bind(this));
  }

  assertThrowMessage(err) {
    expect(err.toString().indexOf('invalid JUMP') > -1 ||
      err.toString().indexOf('out of gas') > -1).to.be(true);
  }
}

module.exports = Util;
