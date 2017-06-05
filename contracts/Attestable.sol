pragma solidity ^0.4.8;


/**
 * @title Attestable
 * @dev The Attestable contract....
 */
contract Attestable {
  event LoanAttested(uint256 _timestamp);

  address public attestor;
  bytes public attestationCommitment;

  /**
   * @dev The Attestable constructor throws if an inheriting contract has not
   * set an attestor
   */
  function Attestable(address _attestor) {
    attestor = _attestor;
  }

  function attestToBorrower(bytes _attestationCommitment) {
    if (msg.sender != attestor)
      throw;
    attestationCommitment = _attestationCommitment;
    LoanAttested(block.timestamp);
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
   modifier afterLoanAttested() {
     if (attestationCommitment.length == 0) {
       throw;
     }
     _;
   }
}
