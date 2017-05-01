pragma solidity ^0.4.0;

import "./DSMath.sol";

contract Loan {
  enum PeriodType { Weekly, Monthly, Yearly, FixedDate }
  event Payment(address indexed _from, uint _value, uint _timestamp);
  event Investment(address indexed _from, uint _value, uint _timestamp);
  event LoanTermBegin(uint _timestamp);
  event LoanAttested(uint _timestamp);

  // Requested principal of the loan
  uint public principal;
  // Length of each period
  uint public periodLength;
  // Unit of time referred to in the period length (i.e. 60 Months vs. 5 Years)
  PeriodType public periodType;
  // Interest rate charged on basis of every period
  uint public interestRate;
  // True if interest is compounded at each period, false if not
  bool public isInterestCompounded;
  // Length in number of periods
  // NOTE: If period is of type "FixedDate", termLength represents the UNIX
  //       timestamp of the repayment date.
  uint public termLength;
  // Block number before which investors will not be allowed to withdraw their funds
  uint public fundingPeriodTimeLock;

  address public borrower;
  address public attestor;

  bytes public attestationUrl;

  mapping(address => uint) public amountInvested;
  uint public totalInvested;
  uint public totalRepaid;

  modifier onlyInvestors() {
    if (amountInvested[msg.sender] == 0)
      throw;
    _;
  }

  function Loan(address _attestorAddr,
                uint _principal,
                PeriodType _periodType,
                uint _interestRate,
                bool _isInterestCompounded,
                uint _termLength,
                uint _fundingPeriodTimeLock) {
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

  function fundLoan() payable {
    // Throw if loan is unattested or has been fully funded
    if (attestationUrl.length == 0 || totalInvested == principal) {
      throw;
    }
    uint principalRemaining = principal - totalInvested;
    uint currentInvestmentAmount = DSMath.min(msg.value, principalRemaining);
    amountInvested[msg.sender] += currentInvestmentAmount;
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
    Payment(msg.sender, msg.value, block.timestamp);
    totalRepaid += msg.value;
  }
}
