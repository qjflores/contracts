
pragma solidity ^0.4.8;

import "./AttestationLib.sol";
import "./TimeLockLib.sol";
import "./RedeemableTokenLib.sol";


/**
 * @title Loan
 *
 * @dev Simple unsecured loan implementation with simple interest.
 * @dev Heavily based on the CrowdsaleToken contract in the
 *        OpenZeppelin reference contracts.
 */
library LoanLib {
  using RedeemableTokenLib for RedeemableTokenLib.Accounting;
  using AttestationLib for AttestationLib.Attestation;
  using TimeLockLib for TimeLockLib.TimeLock;
  using SafeMath for uint;

  enum PeriodType { Daily, Weekly, Monthly, Yearly, FixedDate }

  /**
   EVENTS
  */
  event PeriodicRepayment(bytes32 indexed _uuid, address indexed _from, uint _value, uint _timestamp);
  event Investment(bytes32 indexed _uuid, address indexed _from, uint _value, uint _timestamp);
  event LoanTermBegin(bytes32 indexed _uuid, address indexed _borrower, uint _timestamp);

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

  struct Loan {
    RedeemableTokenLib.Accounting token;
    AttestationLib.Attestation attestation;
    TimeLockLib.TimeLock timelock;
    address borrower;
    uint totalInvested;
    PeriodType periodType;
    uint periodLength;
    uint termLength;
    uint interest;
  }


  /*
      MODIFIERS
    ========================================================================
  */
  modifier assert(bool required) {
    if (!required) {
      throw;
    }
    _;
  }

  function beforeLoanFunded(Loan storage self) returns (bool beforeLoanFunded) {
    return (self.totalInvested < self.token.totalSupply);
  }

  function afterLoanFunded(Loan storage self) returns (bool afterLoanFunded) {
    return (self.totalInvested == self.token.totalSupply);
  }

  /**
   * @dev Funds the loan request, refunds any remaining ether if the transaction
   *    fully funds the loan, issues tokens representing ownership in the loan
   *    to tokenRecipient, and transfers the principal to the borrower if the
   *    loan is fully funded.
   * @param tokenRecipient The address which will recieve the new loan tokens.
   */
  function fundLoan(Loan storage self, bytes32 uuid, address tokenRecipient)
        assert(self.attestation.afterAttestedTo()) {
    if (msg.value == 0) {
      throw;
    }

    uint remainingPrincipal = self.token.totalSupply.sub(self.totalInvested);

    uint currentInvestmentAmount = SafeMath.min256(remainingPrincipal, msg.value);
    self.totalInvested = self.totalInvested.add(currentInvestmentAmount);

    self.token.balances[tokenRecipient] = self.token.balances[tokenRecipient].add(currentInvestmentAmount);
    Investment(uuid, tokenRecipient, currentInvestmentAmount, block.timestamp);

    if (loanFullyFunded(self)) {
      if (!self.borrower.send(self.token.totalSupply)) {
        throw;
      }
      LoanTermBegin(uuid, self.borrower, block.timestamp);
    }

    if (msg.value.sub(currentInvestmentAmount) > 0) {
      if(!msg.sender.send(msg.value.sub(currentInvestmentAmount)))
        throw;
    }
  }

  /**
   * @dev If the time lock period has lapsed and the loan is, as of yet,
   *    not fully funded, withdrawInvestment allows investors to withdraw
   *    their deposited ether from the contract.  If the contract is fully
   *    emptied out, the contract self destructs.
   */
  function withdrawInvestment(Loan storage self)
        assert(self.timelock.afterTimeLock())
        assert(beforeLoanFunded(self)) {
    uint investmentRefund = self.token.balanceOf(msg.sender);
    self.token.balances[msg.sender] = 0;

    self.totalInvested = self.totalInvested.sub(investmentRefund);
    if (!msg.sender.send(investmentRefund))
      throw;

    if (self.totalInvested == 0)
      self.borrower = 0;
  }

  /**
   * @dev Method used by borrowers to make repayments to the loan contract
   *  at the end of each of payment period.
   */
  function periodicRepayment(Loan storage self, bytes32 uuid)
      assert(afterLoanFunded(self)) {
    if (msg.value == 0)
      throw;

    self.token.redeemableValue = self.token.redeemableValue.add(msg.value);

    PeriodicRepayment(uuid, msg.sender, msg.value, block.timestamp);
  }

  /**
   * @dev Overrides the isRedeemable abstract funciton in RedeemableToken
   *   in order to specify that investors can only withdraw the returned
   *    principal + interest once a loan has been fully funded and
   *    the borrower is in the midst of their loan term.
   * @return Whether investors should be allowed to redeem repayments yet.
   */
  function isRedeemable(Loan storage self, address owner)
              assert(afterLoanFunded(self)) returns (bool redeemable) {
    return (self.token.balanceOf(owner) > 0);
  }

  /**
   * @dev Loan is considered fully funded when the desired principal is raised.
   * @return bool: Whether the loan is fully funded.
   */
  function loanFullyFunded(Loan storage self) returns (bool funded) {
    return (self.totalInvested >= self.token.totalSupply);
  }
}
