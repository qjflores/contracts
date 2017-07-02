
pragma solidity ^0.4.8;

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
  using SafeMath for uint;

  enum PeriodType { Daily, Weekly, Monthly, Yearly, FixedDate }
  enum LoanState { Auction, Review, Accepted, Rejected }

  modifier onlyLoanState(Loan storage self, LoanState state) {
    updateCurrentLoanState(self);
    if (self.state != state) {
      throw;
    }
    _;
  }

  modifier onlyBorrower(Loan storage self) {
    if (msg.sender != self.borrower) {
      throw;
    }
    _;
  }

  /**
   EVENTS
  */
  event PeriodicRepayment(bytes32 indexed _uuid, address indexed _from, uint _value, uint _timestamp);
  event Investment(bytes32 indexed _uuid, address indexed _from, uint _value, uint _timestamp);
  event Log(string theString);
  event LoanTermBegin(
    bytes32 indexed uuid,
    address indexed borrower,
    address[] investors,
    uint blockNumber
  );

  uint8 public constant MAX_INVESTORS_PER_LOAN = 10;

  struct Bid {
    address investor;
    uint256 amount;
    uint256 minInterestRate;
  }

  struct Loan {
    address[] bidders;
    mapping (address => Bid) bids;
    LoanState state;
    RedeemableTokenLib.Accounting token;
    address borrower;
    uint256 principal;
    bytes terms;
    address attestor;
    uint256 attestorFee;
    uint256 defaultRisk;
    uint256 totalInvested;
    uint256 interestRate;
    bytes32 r;
    bytes32 s;
    uint8 v;
    uint256 auctionEndBlock;
    uint256 reviewPeriodEndBlock;
  }


  /*
      MODIFIERS
    ========================================================================
  */
  function duringAuctionPeriod(Loan storage self) returns (bool duringAuctionPeriod) {
    return (self.state == LoanState.Auction);
  }

  function beforeLoanFunded(Loan storage self) returns (bool beforeLoanFunded) {
    return (self.totalInvested < self.token.totalSupply);
  }

  function afterLoanFunded(Loan storage self) returns (bool afterLoanFunded) {
    return (self.totalInvested == self.token.totalSupply);
  }

  function bid(Loan storage self, address tokenRecipient, uint256 minInterestRate) {
    updateCurrentLoanState(self);
    assertLoanState(self, LoanState.Auction);

    if (msg.value == 0) {
      throw;
    }

    if (self.bids[tokenRecipient].investor != address(0)) {
      throw;
    }

    self.bids[tokenRecipient] = Bid(tokenRecipient, msg.value, minInterestRate);
    self.bidders.push(tokenRecipient);
  }

  function acceptBids(
    Loan storage self,
    bytes32 uuid,
    address[] bidders,
    uint256[] bidAmounts
  ) onlyBorrower(self)
    onlyLoanState(self, LoanState.Review)
  {

    if (bidders.length > MAX_INVESTORS_PER_LOAN ||
          bidAmounts.length > MAX_INVESTORS_PER_LOAN) {
      throw;
    }

    uint256 totalBalanceAccepted = 0;

    for (uint8 i = 0; i < bidders.length; i++) {
      self.bids[bidders[i]].amount = self.bids[bidders[i]].amount.sub(bidAmounts[i]);
      self.token.balances[bidders[i]] = bidAmounts[i];
      totalBalanceAccepted = totalBalanceAccepted.add(bidAmounts[i]);
    }

    if (totalBalanceAccepted != self.principal) {
      throw;
    }

    if (!self.borrower.send(self.principal)) {
      throw;
    }

    self.state = LoanState.Accepted;

    LoanTermBegin(uuid, self.borrower, bidders, block.number);
  }

  function rejectBids(Loan storage self) onlyLoanState(self, LoanState.Review) {
    self.state = LoanState.Rejected;
  }

  function getNumBids(Loan storage self) returns (uint256) {
    return self.bidders.length;
  }

  function getBid(Loan storage self, uint256 index) returns (address, uint256, uint256) {
    return (
      self.bids[self.bidders[index]].investor,
      self.bids[self.bidders[index]].amount,
      self.bids[self.bidders[index]].minInterestRate
    );
  }
  /**
   * @dev If the time lock period has lapsed and the loan is, as of yet,
   *    not fully funded, withdrawInvestment allows investors to withdraw
   *    their deposited ether from the contract.  If the contract is fully
   *    emptied out, the contract self destructs.
   */
  function withdrawInvestment(Loan storage self) {
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
  function periodicRepayment(Loan storage self, bytes32 uuid) {
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
  function isRedeemable(Loan storage self, address owner) returns (bool redeemable) {
    return (self.token.balanceOf(owner) > 0);
  }

  /**
   * @dev Loan is considered fully funded when the desired principal is raised.
   * @return bool: Whether the loan is fully funded.
   */
  function loanFullyFunded(Loan storage self) returns (bool funded) {
    return (self.totalInvested >= self.token.totalSupply);
  }

  function updateCurrentLoanState(Loan storage self) {
    if (block.number <= self.auctionEndBlock) {
      self.state = LoanState.Auction;
    } else if (block.number > self.auctionEndBlock &&
        block.number <= self.reviewPeriodEndBlock) {
      self.state = LoanState.Review;
    } else if (block.number > self.reviewPeriodEndBlock) {
      if (self.state != LoanState.Accepted && self.state != LoanState.Rejected) {
        self.state = LoanState.Rejected;
      }
    }
  }

  function assertLoanState(Loan storage self, LoanState state) internal {
    if (self.state != state) {
      throw;
    }
  }
}
