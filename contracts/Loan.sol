pragma solidity ^0.4.0;

import "./DSMath.sol";

contract Loan {
  uint public principal;
  uint public interestRateMonthly;
  uint public termLengthMonths;
  bytes32 public amortizationSchedule;

  address public borrower;
  address public attestor;

  mapping(address => uint) public amountInvested;

  function Loan(address _attestorAddr, uint _principal, uint _interestRateMonthly,
    uint _termLengthMonths, bytes32 _amortizationSchedule) {
    borrower = msg.sender;
    attestor = _attestorAddr;
    principal = _principal;
    interestRateMonthly = _interestRateMonthly;
    termLengthMonths = _termLengthMonths;
    amortizationSchedule = _amortizationSchedule;
  }
}
