pragma solidity ^0.4.8;

import "./zeppelin/SafeMath.sol";
import "./Attestable.sol";
import "./TimeLocked.sol";
import "./RedeemableToken.sol";


/**
 * @title Loan
 *
 * @dev Simple unsecured loan implementation with simple interest.
 * @dev Heavily based on the CrowdsaleToken contract in the
 *        OpenZeppelin reference contracts.
 */
contract Loan is RedeemableToken, Attestable, TimeLocked {
  /**
   EVENTS
  */
  event PeriodicRepayment(address indexed _from, uint _value, uint _timestamp);
  event Investment(address indexed _from, uint _value, uint _timestamp);
  event LoanTermBegin(uint _timestamp);

  address public borrower;

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
    interest: is the amount of interest in ether owed on top principal repayments
      at each payment period's due date (TODO: Add compounding interest)
    decimals: since floats can't natively be represented in Solidity, decimals
      refers to the number of decimal points represented 
  */
  enum PeriodType { Daily, Weekly, Monthly, Yearly, FixedDate }
  PeriodType public periodType;
  uint public periodLength;
  uint public termLength;
  uint public principal;
  uint public interest;
  uint public constant decimals = 18;

  uint public constant PRICE = 1; // 1 Ether = 1 Loan Token
  uint public totalInvested;

  /*
      MODIFIERS
    ========================================================================
  */
  modifier beforeLoanFunded() {
    if (totalInvested >= principal)
      throw;
    _;
  }

  modifier afterLoanFunded() {
    if (totalInvested < principal)
      throw;
    _;
  }

  function Loan(address _attestor,
                uint _principal,
                PeriodType _periodType,
                uint _periodLength,
                uint _interest,
                uint _termLength,
                uint _fundingPeriodTimeLock)
            Attestable(_attestor)
            TimeLocked(_fundingPeriodTimeLock) {
    borrower = msg.sender;
    principal = _principal;
    totalSupply = _principal;
    periodType = _periodType;
    periodLength = _periodLength;
    interest = _interest;
    termLength = _termLength;
  }

  /**
   * @dev Fallback function which receives ether and, if the loan is fully funded,
   * throws, and, if the loan is not fully funded,
   * sends the appropriate number of loan tokens to the sender.
   */
  function () payable {
    if (loanFullyFunded()) {
      throw;
    } else {
      fundLoan(msg.sender);
    }
  }

  /**
   * @dev Funds the loan request, refunds any remaining ether if the transaction
   *    fully funds the loan, issues tokens representing ownership in the loan
   *    to tokenRecipient, and transfers the principal to the borrower if the
   *    loan is fully funded.
   * @param tokenRecipient The address which will recieve the new loan tokens.
   */
  function fundLoan(address tokenRecipient) payable afterAttestedTo {
    if (msg.value == 0) {
      throw;
    }

    uint remainingPrincipal = principal.sub(totalInvested);
    uint currentInvestmentAmount = SafeMath.min256(remainingPrincipal, msg.value);

    totalInvested = totalInvested.add(currentInvestmentAmount);

    balances[tokenRecipient] = balances[tokenRecipient].add(currentInvestmentAmount);
    Investment(tokenRecipient, currentInvestmentAmount, block.timestamp);

    if (loanFullyFunded()) {
      if (!borrower.send(principal)) {
        throw;
      }
      LoanTermBegin(block.timestamp);
    }

    if (msg.value - currentInvestmentAmount > 0) {
      if(!msg.sender.send(msg.value - currentInvestmentAmount))
        throw;
    }
  }

  /**
   * @dev If the time lock period has lapsed and the loan is, as of yet,
   *    not fully funded, withdrawInvestment allows investors to withdraw
   *    their deposited ether from the contract.  If the contract is fully
   *    emptied out, the contract self destructs.
   */
  function withdrawInvestment() afterTimeLock beforeLoanFunded {
    uint investmentRefund = balanceOf(msg.sender);
    balances[msg.sender] = 0;

    totalInvested = totalInvested.sub(investmentRefund);

    if (!msg.sender.send(investmentRefund))
      throw;

    if (totalInvested == 0)
      selfdestruct(msg.sender);
  }

  /**
   * @dev Method used by borrowers to make repayments to the loan contract
   *  at the end of each of payment period.
   */
  function periodicRepayment() payable afterLoanFunded {
    if (msg.value == 0)
      throw;

    redeemableValue = redeemableValue.add(msg.value);

    PeriodicRepayment(msg.sender, msg.value, block.timestamp);
  }

  /**
   * @dev Overrides the isRedeemable abstract funciton in RedeemableToken
   *   in order to specify that investors can only withdraw the returned
   *    principal + interest once a loan has been fully funded and
   *    the borrower is in the midst of their loan term.
   * @return Whether investors should be allowed to redeem repayments yet.
   */
  function isRedeemable(address owner)
              afterLoanFunded returns (bool redeemable) {
    return (balanceOf(owner) > 0);
  }

  /**
   * @dev Returns the price of each loan token (namely, 1 Ether = 1 Loan Token)
   * @return The price per unit of token.
   */
  function getPrice() constant returns (uint result) {
    return PRICE;
  }

  /**
   * @dev Loan is considered fully funded when the desired principal is raised.
   * @return bool: Whether the loan is fully funded.
   */
  function loanFullyFunded() returns (bool funded) {
    return (totalInvested == principal);
  }
}
