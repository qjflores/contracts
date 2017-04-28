pragma solidity ^0.4.0;

import "./DSMath.sol";

contract Loan {
  enum PeriodType { Weekly, Monthly, Yearly, FixedDate }

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

  address public borrower;
  address public attestor;

  bytes32 public attestationUrl;

  mapping(address => uint) public amountInvested;

  function Loan(address _attestorAddr, uint _principal, PeriodType _periodType,
     uint _interestRate, bool _isInterestCompounded, uint _termLength) {
    borrower = msg.sender;
    attestor = _attestorAddr;
    principal = _principal;
    periodType = _periodType;
    interestRate = _interestRate;
    isInterestCompounded = _isInterestCompounded;
    termLength = _termLength;
  }
}
