function Dharma (web3) {
  this.getLoans = function(path, startBlockNumber, endBlockNumber) {
    loan = require(path);
    loan_binary = loan.unlinked_binary;

    if (endBlockNumber == null) {
      endBlockNumber = web3.eth.blockNumber;
      console.log("Using endBlockNumber: " + endBlockNumber);
    }
    if (startBlockNumber == null) {
      startBlockNumber = Math.max(endBlockNumber - 1000, 0);
      console.log("Using startBlockNumber: " + startBlockNumber);
    }

    for (var i = startBlockNumber; i <= endBlockNumber; i++) {
      if (i % 1000 == 0) {
        console.log("Searching block " + i);
      }
      var block = web3.eth.getBlock(i, true);
      if (block != null && block.transactions != null) {
        block.transactions.forEach( function(e) {
          if (e.to == '0x0' && e.input.startsWith(loan_binary)) {
            console.log(e.hash);
          }
        });
      }
    }
  }
}

exports = function (web3)
