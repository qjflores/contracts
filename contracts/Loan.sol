pragma solidity ^0.4.0;

contract Loan {
  struct Terms {
    uint principal;
    uint apr;
    uint termLengthMonths;
    bytes32 amortizationSchedule;
  }

  Terms public terms;
  address borrower;
  address attestor;

  mapping(address => uint) public amountInvested;

  function Loan(address attestorAddr, uint principal, uint apr,
    uint termLengthMonths, bytes32 amortizationSchedule) {
    borrower = msg.sender;
    attestor = attestorAddr;
    terms.principal = principal;
    terms.apr = apr;
    terms.termLengthMonths = termLengthMonths;
    terms.amortizationSchedule = amortizationSchedule;
  }
}
