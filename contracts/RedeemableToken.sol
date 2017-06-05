pragma solidity ^0.4.8;

import "./zeppelin/token/StandardToken.sol";

/**
 * @title RedeemableToken
 * @dev The RedeemableToken inherits from OpenZeppelin's StandardToken
 *    encapsulates the redemption logic behind any digital cash-flow
 *    generating assets such as loans and bonds.
 */
contract RedeemableToken is StandardToken {
  event InvestmentRedeemed(address _to, uint _value, uint _timestamp);
  event Log(uint message);

  // The current total amount of redeemable tokens that have to-date
  // become available in the contract -- this includes tokens that
  // have already been redeemed.
  uint public redeemableValue;

  // Amount of tokens redeemed to date by each investor
  mapping (address => uint) public balanceRedeemed;

  /*
    At any point in time in which token value is redeemable, the amount of
   tokens an investor X is entitled to equals:
      ((amountXInvested / totalSupply) * redeemableValue) - amountRedeemedByX
  */
  function redeemValue() {
    if (!isRedeemable(msg.sender))
      throw;

    uint investorEntitledTo = balanceOf(msg.sender)
                                .mul(redeemableValue)
                                .div(totalSupply);

    uint remainingBalance = investorEntitledTo - balanceRedeemed[msg.sender];

    if (remainingBalance == 0)
      throw;

    balanceRedeemed[msg.sender] = balanceRedeemed[msg.sender].add(remainingBalance);
    if (!msg.sender.send(remainingBalance))
      throw;

    InvestmentRedeemed(msg.sender, remainingBalance, block.timestamp);
  }

  // Abstract function that determines when investors are allowed to redeem
  // tokens from the contract.
  function isRedeemable(address owner) returns (bool redeemable);
}
