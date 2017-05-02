pragma solidity ^0.4.0;

import "./DSMath.sol";

contract Loan {
  enum PeriodType { Weekly, Monthly, Yearly, FixedDate }
  event Payment(address indexed _from, uint128 _value, uint256 _timestamp);
  event Investment(address indexed _from, uint128 _value, uint256 _timestamp);
  event InvestmentRedeemed(address indexed _to, uint128 _value, uint256 _timestamp);
  event LoanTermBegin(uint256 _timestamp);
  event LoanAttested(uint256 _timestamp);

  // Requested principal of the loan
  uint128 public principal;
  // Length of each period
  uint128 public periodLength;
  // Unit of time referred to in the period length (i.e. 60 Months vs. 5 Years)
  PeriodType public periodType;
  // Interest rate charged on basis of every period
  uint128 public interestRate;
  // True if interest is compounded at each period, false if not
  bool public isInterestCompounded;
  // Length in number of periods
  // NOTE: If period is of type "FixedDate", termLength represents the UNIX
  //       timestamp of the repayment date.
  uint128 public termLength;
  // Timestamp before which investors will not be allowed to withdraw their funds
  uint128 public fundingPeriodTimeLock;

  address public borrower;
  address public attestor;

  bytes public attestationUrl;

  struct Investor {
    uint128 amountInvested;
    uint128 amountRedeemed;
  }

  mapping(address => Investor) public investors;
  uint128 public totalInvested;
  uint128 public totalRepaid;

  modifier onlyInvestors() {
    if (investors[msg.sender].amountInvested == 0)
      throw;
    _;
  }

  modifier afterTimelock() {
    if (block.timestamp < fundingPeriodTimeLock)
      throw;
    _;
  }

  modifier afterLoanFunded() {
    if (totalInvested < principal)
      throw;
    _;
  }

  modifier beforeLoanFunded() {
    if (totalInvested >= principal)
      throw;
    _;
  }

  modifier afterLoanAttested() {
    if (attestationUrl.length == 0)
      throw;
    _;
  }

  function Loan(address _attestorAddr,
                uint128 _principal,
                PeriodType _periodType,
                uint128 _interestRate,
                bool _isInterestCompounded,
                uint128 _termLength,
                uint128 _fundingPeriodTimeLock) {
    borrower = msg.sender;
    attestor = _attestorAddr;
    principal = _principal;
    periodType = _periodType;
    interestRate = _interestRate;
    isInterestCompounded = _isInterestCompounded;
    termLength = _termLength;
    fundingPeriodTimeLock = _fundingPeriodTimeLock;
  }

  function attestToBorrower(bytes _attestationUrl) {
    if (msg.sender != attestor)
      throw;
    attestationUrl = _attestationUrl;
    LoanAttested(block.timestamp);
  }

  function fundLoan() payable afterLoanAttested beforeLoanFunded {
    uint128 principalRemaining = principal - totalInvested;
    uint128 currentInvestmentAmount = DSMath.cast(DSMath.min(msg.value, principalRemaining));
    investors[msg.sender].amountInvested += currentInvestmentAmount;
    totalInvested += currentInvestmentAmount;

    Investment(msg.sender, currentInvestmentAmount, block.timestamp);

    // If requested loan principal is fully funded, transfer balance to borrower
    if (totalInvested == principal) {
      if(!borrower.send(principal))
        throw;
      LoanTermBegin(block.timestamp);
    }

    if (msg.value - currentInvestmentAmount > 0) {
      if(!msg.sender.send(msg.value - currentInvestmentAmount))
        throw;
    }
  }

  function payBackLoan() payable {
    if (msg.value == 0)
      throw;
    Payment(msg.sender, DSMath.cast(msg.value), block.timestamp);
    totalRepaid += DSMath.cast(msg.value);
  }

  function redeemInvestment() onlyInvestors afterLoanFunded {
    Investor investor = investors[msg.sender];
    uint128 investorEntitledTo = DSMath.wdiv(DSMath.wmul(investor.amountInvested, totalRepaid), totalInvested);
    uint128 remainingBalance = investorEntitledTo - investor.amountRedeemed;
    if (remainingBalance == 0)
      throw;
    investor.amountRedeemed += remainingBalance;
    if (!msg.sender.send(remainingBalance))
      throw;
    InvestmentRedeemed(msg.sender, remainingBalance, block.timestamp);
  }

  function withdrawInvestment() onlyInvestors afterTimelock beforeLoanFunded {
    uint128 investmentRefund = investors[msg.sender].amountInvested;
    totalInvested -= investmentRefund;
    delete investors[msg.sender];

    if (!msg.sender.send(investmentRefund))
      throw;

    if (totalInvested == 0)
      selfdestruct(msg.sender);
  }

  function transfer(address to) onlyInvestors {
    investors[to] = investors[msg.sender];
    delete investors[msg.sender];
  }
}
