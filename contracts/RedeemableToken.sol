pragma solidity ^0.4.8;

import "./zeppelin/token/StandardToken.sol";

/**
 * @title Redeemable
 * @dev The Redeemable contract....
 */
contract RedeemableToken is StandardToken {
  event InvestmentRedeemed(address _to, uint _value, uint _timestamp);
  event Log(uint message);

  uint public redeemableValue;

  mapping (address => uint) public balanceRedeemed;

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

  function isRedeemable(address owner) returns (bool redeemable);
}
