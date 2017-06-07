pragma solidity ^0.4.8;

import "./LoanLib.sol";
import "./ERC20.sol";

/**
 * @title Loan
 *
 * @dev Simple unsecured loan implementation with simple interest.
 * @dev Heavily based on the CrowdsaleToken contract in the
 *        OpenZeppelin reference contracts.
 */
contract Loan is RedeemableToken, TimeLocked, Attestable {
  using LoanLib as LoanLib.Loan;
  uint public constant decimals = 18;

  /**
   EVENTS
  */
  event PeriodicRepayment(address indexed _from, uint _value, uint _timestamp);
  event Investment(address indexed _from, uint _value, uint _timestamp);
  event LoanTermBegin(uint _timestamp);


  LoanLib.Loan public loan;

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
                PeriodType _periodType,
                uint _periodLength,
                uint _interest,
                uint _termLength,
                uint _fundingPeriodTimeLock)
            Attestable(_attestor)
            TimeLocked(_fundingPeriodTimeLock) {
    loan.borrower = msg.sender;
    loan.totalSupply = _principal;
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
  function fundLoan(address tokenRecipient) payable afterAttestedTo {
    loan.fundLoan(tokenRecipient);
  }

  /**
   * @dev If the time lock period has lapsed and the loan is, as of yet,
   *    not fully funded, withdrawInvestment allows investors to withdraw
   *    their deposited ether from the contract.  If the contract is fully
   *    emptied out, the contract self destructs.
   */
  function withdrawInvestment() afterTimeLock beforeLoanFunded {
    loan.withdrawInvestment();
  }

  /**
   * @dev Method used by borrowers to make repayments to the loan contract
   *  at the end of each of payment period.
   */
  function periodicRepayment() payable afterLoanFunded {
    loan.periodicRepayment();
  }
}
