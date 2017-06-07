pragma solidity ^0.4.8;

import "./zeppelin/token/StandardToken.sol";

/**
 * @title RedeemableToken
 * @dev The RedeemableToken inherits from OpenZeppelin's StandardToken
 *    encapsulates the redemption logic behind any digital cash-flow
 *    generating assets such as loans and bonds.
 */
contract RedeemableTokenLib is StandardTokenLib {
  using SafeMath for uint;

  struct Accounting {
    uint totalSupply;
    mapping(address => uint) balances;
    mapping (address => mapping (address => uint)) allowed;

    // The current total amount of redeemable tokens that have to-date
    // become available in the contract -- this includes tokens that
    // have already been redeemed.
    uint redeemableValue;
    // Amount of tokens redeemed to date by each investor
    mapping (address => uint) balanceRedeemed;
  }

  event InvestmentRedeemed(address _to, uint _value, uint _timestamp);

  /**
   * @dev Fix for the ERC20 short address attack.
   */
  modifier onlyPayloadSize(uint size) {
     if(msg.data.length < size + 4) {
       throw;
     }
     _;
  }

  /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint _value) onlyPayloadSize(2 * 32) {
    self.balances[msg.sender] = self.balances[msg.sender].sub(_value);
    self.balances[_to] = self.balances[_to].add(_value);
    Transfer(msg.sender, _to, _value);
  }

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) constant returns (uint balance) {
    return self.balances[_owner];
  }

  /**
   * @dev Transfer tokens from one address to another
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint the amout of tokens to be transfered
   */
  function transferFrom(address _from, address _to, uint _value) onlyPayloadSize(3 * 32) {
    var _allowance = self.allowed[_from][msg.sender];

    // Check is not needed because sub(_allowance, _value) will already throw if this condition is not met
    // if (_value > _allowance) throw;

    self.balances[_to] = self.balances[_to].add(_value);
    self.balances[_from] = self.balances[_from].sub(_value);
    self.allowed[_from][msg.sender] = _allowance.sub(_value);
    Transfer(_from, _to, _value);
  }

  /**
   * @dev Aprove the passed address to spend the specified amount of tokens on beahlf of msg.sender.
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender, uint _value) {

    // To change the approve amount you first have to reduce the addresses`
    //  allowance to zero by calling `approve(_spender, 0)` if it is not
    //  already 0 to mitigate the race condition described here:
    //  https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
    if ((_value != 0) && (self.allowed[msg.sender][_spender] != 0)) throw;

    self.allowed[msg.sender][_spender] = _value;
    Approval(msg.sender, _spender, _value);
  }

  /**
   * @dev Function to check the amount of tokens than an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint specifing the amount of tokens still avaible for the spender.
   */
  function allowance(address _owner, address _spender) constant returns (uint remaining) {
    return self.allowed[_owner][_spender];
  }

  /*
    At any point in time in which token value is redeemable, the amount of
   tokens an investor X is entitled to equals:
      ((amountXInvested / totalSupply) * redeemableValue) - amountRedeemedByX
  */
  function redeemValue() {
    uint investorEntitledTo = balanceOf(msg.sender)
                                .mul(self.redeemableValue)
                                .div(self.totalSupply);

    uint remainingBalance = investorEntitledTo - self.balanceRedeemed[msg.sender];

    if (remainingBalance == 0)
      throw;

    self.balanceRedeemed[msg.sender] = self.balanceRedeemed[msg.sender].add(remainingBalance);
    if (!msg.sender.send(remainingBalance))
      throw;

    InvestmentRedeemed(msg.sender, remainingBalance, block.timestamp);
  }
}
