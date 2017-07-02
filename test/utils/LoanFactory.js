import stringify from 'json-stable-stringify';
import util from './Util';

class LoanFactory {
  static generateSignedLoan(loan) {
    const terms = LoanFactory._generateTermsByteString(loan.terms);
    let unsignedLoan = Object.assign({}, loan);
    unsignedLoan.terms = terms;

    const loanHash = web3.sha3(stringify(unsignedLoan));
    const attestorSignature = web3.eth.sign(unsignedLoan.attestor, loanHash)
    const signedLoan = Object.assign(unsignedLoan, {
      signature: {
        r: '0x' + attestorSignature.slice(2, 66),
        s: '0x' + attestorSignature.slice(66, 130),
        v: '0x' + attestorSignature.slice(130, 132)
      }
    })

    return signedLoan;
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
