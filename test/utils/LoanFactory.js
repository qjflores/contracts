import stringify from 'json-stable-stringify';
import util from './Util';
import _ from 'lodash';
import Random from 'random-js';

class LoanFactory {
  static generateSignedLoan(loan) {
    const terms = LoanFactory._generateTermsByteString(loan.terms);
    let unsignedLoan = _.cloneDeep(loan);
    unsignedLoan.terms = terms;

    const loanHash = web3.sha3(stringify(unsignedLoan));
    const attestorSignature = web3.eth.sign(unsignedLoan.attestor, loanHash)
    unsignedLoan.signature = {
      r: '0x' + attestorSignature.slice(2, 66),
      s: '0x' + attestorSignature.slice(66, 130),
      v: '0x' + attestorSignature.slice(130, 132)
    }

    const signedLoan = unsignedLoan;
    return signedLoan;
  }

  static async generateLoanAtState(loan, contract, state, _bidders, _bids) {
    const signedLoan = await this.generateSignedLoan(loan);

    let instance;
    let bidders = _bidders || [signedLoan.attestor];

    if (state >= 0) {
      instance = await contract.createLoan(
        signedLoan.uuid,
        signedLoan.borrower,
        signedLoan.principal,
        signedLoan.terms,
        signedLoan.attestor,
        signedLoan.attestorFee,
        signedLoan.defaultRisk,
        signedLoan.signature.r,
        signedLoan.signature.s,
        signedLoan.signature.v,
        bidders.length,
        bidders.length
      );
    }

    if (state > 0) {
      for (let i = 0; i < bidders.length; i++) {
        let amount;
        let minInterestRate;

        if (_bids) {
          amount = _bids[i].amount;
          minInterestRate = _bids[i].minInterestRate;
        } else {
          amount = _bidders ? Random().real(0.2, 0.3) : 1;
          minInterestRate = Random().real(0.1, 0.2);
        }

        await contract.bid(
          signedLoan.uuid,
          bidders[i],
          web3.toWei(minInterestRate, 'ether'),
          { value: web3.toWei(amount, 'ether') }
        )
      }
    }

    if (state == 2) {
      await contract.acceptBids(
        signedLoan.uuid,
        bidders.slice(0, 5),
        [web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
         web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
         web3.toWei(0.2, 'ether')]
      )
    }

    if (state == 3) {
      await contract.rejectBids(signedLoan.uuid);
    }

    return loan;
  }

  static _generateTermsByteString(terms) {
    let version = util.stripZeroEx(terms.version);
    let periodType = util.stripZeroEx(web3.toHex(terms.periodType))
    let periodLength = util.stripZeroEx(web3.toHex(terms.periodLength))
    let termLength = util.stripZeroEx(web3.toHex(terms.termLength))
    let compounded = util.stripZeroEx(web3.toHex(terms.compounded))

    version = web3.padLeft(version, 64) // bytes32
    periodType = web3.padLeft(periodType, 2) // uint8
    periodLength = web3.padLeft(periodLength, 64) // uint256
    termLength = web3.padLeft(termLength, 64) // uint256
    compounded = web3.padLeft(compounded, 2) // uint8

    return '0x' + version + periodType + periodLength + termLength + compounded;
  }
}

module.exports = LoanFactory
