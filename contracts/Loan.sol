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

  uint public constant decimals = 18;

  /**
   EVENTS
  */
  event PeriodicRepayment(address indexed _from, uint _value, uint _timestamp);
  event Investment(address indexed _from, uint _value, uint _timestamp);
  event LoanTermBegin(uint _timestamp);


  LoanLib.Loan loan;

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
    function Loan(address _attestor,
                uint _principal,
                LoanLib.PeriodType _periodType,
                uint _periodLength,
                uint _interest,
                uint _termLength,
                uint _fundingPeriodTimeLock) {
    loan.borrower = msg.sender;
    loan.token.totalSupply = _principal;
    loan.attestation.attestor = _attestor;
    loan.timelock.timeLock = _fundingPeriodTimeLock;
    loan.periodType = _periodType;
    loan.periodLength = _periodLength;
    loan.interest = _interest;
    loan.termLength = _termLength;
  }

  /**
   * @dev Fallback function which receives ether and, if the loan is fully funded,
   * throws, and, if the loan is not fully funded,
   * sends the appropriate number of loan tokens to the sender.
   */
  function () payable {
    loan.fallback();
  }

  /**
   * @dev Funds the loan request, refunds any remaining ether if the transaction
   *    fully funds the loan, issues tokens representing ownership in the loan
   *    to tokenRecipient, and transfers the principal to the borrower if the
   *    loan is fully funded.
   * @param tokenRecipient The address which will recieve the new loan tokens.
   */
  function fundLoan(address tokenRecipient) {
    loan.fundLoan(tokenRecipient);
  }

  /**
   * @dev If the time lock period has lapsed and the loan is, as of yet,
   *    not fully funded, withdrawInvestment allows investors to withdraw
   *    their deposited ether from the contract.  If the contract is fully
   *    emptied out, the contract self destructs.
   */
  function withdrawInvestment() {
    loan.withdrawInvestment();
  }

  /**
   * @dev Method used by borrowers to make repayments to the loan contract
   *  at the end of each of payment period.
   */
  function periodicRepayment() {
    loan.periodicRepayment();
  }

  /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint _value) {
    loan.token.transfer(_to, _value);
  }

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) constant returns (uint balance) {
    return loan.token.balanceOf(_owner);
  }

  /**
   * @dev Transfer tokens from one address to another
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint the amout of tokens to be transfered
   */
  function transferFrom(address _from, address _to, uint _value) {
    loan.token.transferFrom(_from, _to, _value);
  }

  /**
   * @dev Aprove the passed address to spend the specified amount of tokens on beahlf of msg.sender.
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender, uint _value) {
    loan.token.approve(_spender, _value);
  }

  /**
   * @dev Function to check the amount of tokens than an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint specifing the amount of tokens still avaible for the spender.
   */
  function allowance(address _owner, address _spender) constant returns (uint remaining) {
    return loan.token.allowance(_owner, _spender);
  }

  /*
    At any point in time in which token value is redeemable, the amount of
   tokens an investor X is entitled to equals:
      ((amountXInvested / totalSupply) * redeemableValue) - amountRedeemedByX
  */
  function redeemValue() {
    loan.token.redeemValue();
  }
}
