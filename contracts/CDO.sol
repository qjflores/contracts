pragma solidity ^0.4.8;

import "./Loan.sol";
import "./RedeemableTokenLib.sol";
import "./CDOLib.sol";
import "./LoanLib.sol";

/**
 * @title CDO
 *
 * @dev Simple CDO implementation with 1-tranche.
 * @dev The loan contract stores data associated with all unsecured loans
 *        in the Dharma Network's v0.1.0 release.
 */

//TODO: implement full ERC20 functionality
//contract CDO is ERC20 {

contract CDO {
    using CDOLib for CDOLib.CDO;
    using SafeMath for uint;

    //TODO: add events
    //event CDORedeemed(cdo_id,msg.sender,recipient,redeembalbeValue,block.number);

    mapping (bytes32 => CDOLib.CDO) cdos;

    uint256 public constant DECIMALS = 18;

    Loan loanContract;

    //balances_redeemed_per_loan[address][cdo_id][0] is the balance_redeemed by address in the 1st loan of cdos[cdo_id]
    //TODO: make this part of CDOLib.CDO
    mapping (address => mapping(bytes32 => uint[])) balances_redeemed_per_loan;


    function CDO(Loan lc) {
        loanContract = lc;
    }

    // Creates a tokenized CDO, which sends the specified loans to be owned by this contract itself. Issues CDO tokens all to creator of CDO.
    function createCDO(bytes32[] loan_uuids, uint num_tokens, bytes32 cdo_id) {
        //So that we can have 3-tranches.
        require(num_tokens%3==0);
        //TODO: ensure that there are only 5 uuids
        cdos[cdo_id].loan_uuids = loan_uuids;

        for (uint8 i = 0; i < 5; i++) {
            uint transferable = loanContract.balanceOf(loan_uuids[i], msg.sender);

            //also, at this point, if msg.sender were to call redeemValue, where would the ether go??
            loanContract.transfer(loan_uuids[i], this, transferable);
            cdos[cdo_id].num_tokens_per_loan[loan_uuids[i]] = transferable;
        }
        cdos[cdo_id].token.balances[msg.sender] = num_tokens;
        cdos[cdo_id].token.totalSupply = num_tokens;
    }


    function transfer(bytes32 cdo_id, address _to, uint _value) {
        //TODO: add sanity checks/assertions

        cdos[cdo_id].token.balances[msg.sender] =  cdos[cdo_id].token.balances[msg.sender].sub(_value);
        //should we charge a transaction fee?
        cdos[cdo_id].token.balances[_to] = cdos[cdo_id].token.balances[_to].add(_value);
    }

    //((balanceOf(recipient) / totalSupply) * redeemableValue) - amountRedeemedByX
    function redeemValue(bytes32 cdo_id, address recipient) {
        //TODO: add sanity checks/assertions

        for (uint8 i = 0; i < 5; i++) { //(ensure there are only 5 loans)
            bytes32 loan_uuid = cdos[cdo_id].loan_uuids[i];
            uint balance_redeemed = balances_redeemed_per_loan[msg.sender][cdo_id][i];

            uint redeemable_per_loan = loanContract.getRedeemableValue(loan_uuid, this);

            //the following will send the redeemed ether to this token contract
            loanContract.redeemValue(loan_uuid, this);
            uint fraction_tokens_owned = cdos[cdo_id].token.balances[msg.sender].div(cdos[cdo_id].token.totalSupply);
            uint redeemableValue = redeemable_per_loan.mul(fraction_tokens_owned).sub(balance_redeemed);
            if (redeemableValue == 0)
            throw;

            balances_redeemed_per_loan[msg.sender][cdo_id][i] =
            balances_redeemed_per_loan[msg.sender][cdo_id][i].add(redeemableValue);

            if (!recipient.send(redeemableValue))
            throw;
        }
    }
}

//TODO: Implement getter functions