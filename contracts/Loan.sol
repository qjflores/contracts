pragma solidity ^0.4.8;

import "./LoanLib.sol";
import "./RedeemableTokenLib.sol";

/*import "zeppelin-solidity/contracts/token/ERC20.sol";*/

/**
 * @title Loan
 *
 * @dev Simple unsecured loan implementation with simple interest.
 * @dev Heavily based on the CrowdsaleToken contract in the
 *        OpenZeppelin reference contracts.
 */
contract Loan {
  using LoanLib for LoanLib.Loan;
  using RedeemableTokenLib for RedeemableTokenLib.Accounting;
  using AttestationLib for AttestationLib.Attestation;
  using TimeLockLib for TimeLockLib.TimeLock;

  uint public constant decimals = 18;

  /**
   EVENTS
  */
  event PeriodicRepayment(address indexed _from, uint _value, uint _timestamp);
  event Investment(address indexed _from, uint _value, uint _timestamp);
  event LoanTermBegin(uint _timestamp);


  mapping (string => LoanLib.Loan) loans;

  /**
    LOAN TERMS
    ========================================================================
    Period: refers to the time period between each repayment due
      date
    PeriodType: refers to the unit of time in which the period and term length
      are denominated
    periodLength: refers to the number of time units of PeriodType are in any
      given payment period.
        (i.e. period = periodLength * periodType)
    termLength: refers to the number of time units of PeriodType that are in
      the entire loan's term
    Principal: refers to the amount of Wei requested by a borrower
    interestRate: is the percentage interest owed on top principal repayments
      at each payment period's due date (non-compounding)
    decimals: since floats can't natively be represented in Solidity, decimals
      refers to the number of decimal points represented by interestRate
        (i.e. interestRate = % Interest * (10 ** decimals))
  */
    function createLoan(string uuid,
                        address _borrower,
                        address _attestor,
                        uint _principal,
                        LoanLib.PeriodType _periodType,
                        uint _periodLength,
                        uint _interest,
                        uint _termLength,
                        uint _fundingPeriodTimeLock) {
    if (loans[uuid].borrower > 0)
      throw;

    loans[uuid].borrower = _borrower;
    loans[uuid].token.totalSupply = _principal;
    loans[uuid].attestation.attestor = _attestor;
    loans[uuid].timelock.timeLock = _fundingPeriodTimeLock;
    loans[uuid].periodType = _periodType;
    loans[uuid].periodLength = _periodLength;
    loans[uuid].interest = _interest;
    loans[uuid].termLength = _termLength;

  }

  function getBorrower(string uuid) returns (address asdf) {
    return loans[uuid].borrower;
  }

  function getAttestor(string uuid) returns (address) {
    return loans[uuid].attestation.attestor;
  }

  function getAttestation(string uuid) returns (bytes) {
    return loans[uuid].attestation.attestationCommitment;
  }

  function getPrincipal(string uuid) returns (uint) {
    return loans[uuid].token.totalSupply;
  }

  function getPeriodType(string uuid) returns (LoanLib.PeriodType) {
    return loans[uuid].periodType;
  }

  function getPeriodLength(string uuid) returns (uint) {
    return loans[uuid].periodLength;
  }

  function getInterest(string uuid) returns (uint) {
    return loans[uuid].interest;
  }

  function getTermLength(string uuid) returns (uint) {
    return loans[uuid].termLength;
  }

  function getTimelock(string uuid) returns (uint) {
    return loans[uuid].timelock.timeLock;
  }

  function () payable {
    throw;
  }

  /**
   * @dev Funds the loan request, refunds any remaining ether if the transaction
   *    fully funds the loan, issues tokens representing ownership in the loan
   *    to tokenRecipient, and transfers the principal to the borrower if the
   *    loan is fully funded.
   * @param tokenRecipient The address which will recieve the new loan tokens.
   */
  function fundLoan(string uuid, address tokenRecipient) payable {
    loans[uuid].fundLoan(tokenRecipient);
  }

  /**
   * @dev If the time lock period has lapsed and the loan is, as of yet,
   *    not fully funded, withdrawInvestment allows investors to withdraw
   *    their deposited ether from the contract.  If the contract is fully
   *    emptied out, the contract self destructs.
   */
  function withdrawInvestment(string uuid) {
    loans[uuid].withdrawInvestment();
  }

  /**
   * @dev Method used by borrowers to make repayments to the loan contract
   *  at the end of each of payment period.
   */
  function periodicRepayment(string uuid) payable {
    loans[uuid].periodicRepayment();
  }

  /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(string uuid, address _to, uint _value) {
    loans[uuid].token.transfer(_to, _value);
  }

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint representing the amount owned by the passed address.
  */
  function balanceOf(string uuid, address _owner) constant returns (uint balance) {
    return loans[uuid].token.balanceOf(_owner);
  }

  /**
   * @dev Transfer tokens from one address to another
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint the amout of tokens to be transfered
   */
  function transferFrom(string uuid, address _from, address _to, uint _value) {
    loans[uuid].token.transferFrom(_from, _to, _value);
  }

  /**
   * @dev Aprove the passed address to spend the specified amount of tokens on beahlf of msg.sender.
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(string uuid, address _spender, uint _value) {
    loans[uuid].token.approve(_spender, _value);
  }

  /**
   * @dev Function to check the amount of tokens than an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint specifing the amount of tokens still avaible for the spender.
   */
  function allowance(string uuid, address _owner, address _spender) constant returns (uint remaining) {
    return loans[uuid].token.allowance(_owner, _spender);
  }

  function totalSupply(string uuid) returns (uint) {
    return loans[uuid].token.totalSupply;
  }

  /*
    At any point in time in which token value is redeemable, the amount of
   tokens an investor X is entitled to equals:
      ((amountXInvested / totalSupply) * redeemableValue) - amountRedeemedByX
  */
  function redeemValue(string uuid) {
    loans[uuid].token.redeemValue();
  }

  function getRedeemableValue(string uuid) returns (uint) {
    return loans[uuid].token.redeemableValue;
  }

  function attest(string uuid, bytes attestationCommitment) {
    loans[uuid].attestation.attest(attestationCommitment);
  }
}
