var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var Dharma = require('web3');
dharma = new Dharma(web3);

function createNoiseTransactions(accounts, numTxs=50) {
  var promise = null;
  for (var i = 0; i < 50; i++) {
    var fromIndex = Math.floor(Math.random() * (accounts.length));
    var toIndex = Math.floor(Math.random() * (accounts.length));

    if (fromIndex == toIndex)
      continue;

    var newPromise = new Promise(function(accept, reject) {
      web3.eth.sendTransaction({from: accounts[fromIndex],
                                to: accounts[toIndex],
                                value: web3.toWei(0.001, 'ether')},
                               function(error, result) {
        if (error) {
          reject(error);
        }
        if (result) {
          accept(result)
        }
      });
    });
    if (promise) {
      promise = promise.then(newPromise);
    } else {
      promise = newPromise;
    }
  }
  return promise;
}

var Loan = artifacts.require("./Loan.sol");
var testLoanData = require('./data/test_loan_terms.json');

function deployLoanContract(accounts, loanJson) {
  loanTerms = [
    accounts[0], // attestor
    web3.toWei(loanJson.principal, 'ether'), // principal
    loanJson.periodType, // period type
    web3.toWei(loanJson.interestRate, 'ether'), // interestRate,
    loanJson.isInterestCompounded, // is interest compounded
    loanJson.termLength, // term Length
    loanJson.fundingPeriodTimeLock // time lock
  ]
  return Loan.new(...loanTerms, {from: accounts[2]}).then(function(instance) {
    return instance.attestToBorrower(loanJson.attestationUrl, {from: accounts[0]});
  });
}

contract("Loan Browser", function(_accounts) {
  var accounts = _accounts.slice(15);
  deployLoanContract(accounts, testLoanData[0]).then(function(_) {
    return createNoiseTransactions(accounts);
  }).then(function(_) {
    return deployLoanContract(accounts, testLoanData[1]);
  }).then(function(_) {
    return createNoiseTransactions(accounts);
  }).then(function(_) {
    return deployLoanContract(accounts, testLoanData[2]);
  }).then(function(_) {
    return createNoiseTransactions(accounts);
  }).then(function(_) {
    return deployLoanContract(accounts, testLoanData[3]);
  }).then(function(_) {
    return createNoiseTransactions(accounts);
  }).then(function(_) {
    return deployLoanContract(accounts, testLoanData[4]);
  }).then(function(_) {
    return createNoiseTransactions(accounts);
  });
});
