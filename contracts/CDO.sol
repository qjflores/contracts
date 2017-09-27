pragma solidity ^0.4.14;

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

//contract CDO is ERC20 {

contract CDO {
    using CDOLib for CDOLib.CDO;
    using SafeMath for uint;
    using RedeemableTokenLib for RedeemableTokenLib.Accounting;

    //TODO: add events
    //event CDORedeemed(cdo_id,msg.sender,recipient,redeembalbeValue,block.number);

    event CDOCreated(
    bytes32[] loan_uuids,
    bytes32 indexed cdo_id,
    uint num_tokens,
    uint blockNumber,
    address cdoCreator
    );

    event CDOValueRedeemed(
    bytes32 cdo_id
    );

    event CDOTransfer(
    bytes32 cdo_id,
    address from,
    address to,
    uint value
    );

    event LoanContractLinked(
    address loan
    );

    event Withdrawal(
    bytes32 cdo_id,
    uint amount,
    address recipient
    );



    //TODO: cannot be public
    mapping (bytes32 => CDOLib.CDO) cdos;

    //TODO: cannot be public
    mapping (bytes32 => uint) total_redeemed_per_cdo;


    uint256 public constant DECIMALS = 18;

    address public loanContract;

    //balances_redeemed_per_loan[address][cdo_id][0] is the balance_redeemed by address in the 1st loan of cdos[cdo_id]
    //TODO: make this part of CDOLib.CDO
    mapping (address => mapping(bytes32 => mapping(bytes32 => uint))) balances_redeemed_per_loan;

    function linkLoanContract(address lc){
        loanContract = lc;
        LoanContractLinked(lc);
        //TODO: ensure that this address makes sense
    }

    // Creates a tokenized CDO, which sends the specified loans to be owned by this contract itself.
    //Issues CDO tokens all to creator of CDO.
    function createCDO(bytes32[] loan_uuids, uint num_tokens, bytes32 cdo_id, address creator) {
        require(loan_uuids.length < 6);

        //TODO: impelement the following for 3-tranches
        //require(num_tokens%3==0);
        //TODO: ensure that there are less than 5 uuids
        cdos[cdo_id].loan_uuids = loan_uuids;

        for (uint8 i = 0; i < loan_uuids.length; i++) {
            uint transferable = Loan(loanContract).balanceOf(loan_uuids[i], msg.sender);

            Loan(loanContract).transfer(loan_uuids[i], this, transferable);
            cdos[cdo_id].num_tokens_per_loan[loan_uuids[i]] = transferable;
        }
        cdos[cdo_id].token.balances[msg.sender] = num_tokens;
        cdos[cdo_id].token.totalSupply = num_tokens;
        CDOCreated(loan_uuids, cdo_id, num_tokens, block.number, msg.sender);
    }

    function transfer(bytes32 cdo_id, address _to, uint _value) {
        //TODO: add sanity checks/assertions
        assert(_value < cdos[cdo_id].token.balances[msg.sender]);

        cdos[cdo_id].token.balances[msg.sender] =  cdos[cdo_id].token.balances[msg.sender].sub(_value);

        //should we charge a transaction fee?
        cdos[cdo_id].token.balances[_to] = cdos[cdo_id].token.balances[_to].add(_value);
        CDOTransfer(cdo_id, msg.sender, _to, _value);
    }

    // ((balanceOf(recipient) / totalSupply) * redeemableValue) - amountRedeemedByX
    function redeemValue(bytes32 cdo_id) {
       // CDOTransfer(0, 0, tx.origin, tx.origin.balance);
        //TODO: add modifier-based sanity checks/assertions
        //TODO: ENSURE THE SAFETY OF THIS FUNCTION
        uint i = 0;
        //        for (uint8 i = 0; i < cdos[cdo_id].loan_uuids.length; i++) { //(ensure there are only 5 loans)
        bytes32 loan_uuid = cdos[cdo_id].loan_uuids[i];
        uint redeemable_per_loan = Loan(loanContract).getRedeemableValue(loan_uuid, this);
        total_redeemed_per_cdo[cdo_id] = total_redeemed_per_cdo[cdo_id].add(redeemable_per_loan);
       //the following will send the redeemed ether to this token contract
        Loan(loanContract).redeemValue(loan_uuid, this);
        CDOValueRedeemed(cdo_id);

//uint redeemableValue = redeemableValue.sub(redeemed_this_loan);
//        if (redeemableValue == 0) { throw;
//        }

//        balances_redeemed_per_loan[msg.sender][cdo_id][loan_uuid] = balances_redeemed_per_loan[msg.sender][cdo_id][loan_uuid].add(redeemableValue);
//        to_send = to_send.add(redeemableValue);

//                }
//        CDOTransfer(cdo_id, this, msg.sender,this.balance);
//        //(ensure there are only 5 loans)

//        loan_uuid = cdos[cdo_id].loan_uuids[1];
//        Loan(loanContract).redeemValue(loan_uuid, this);

        //uint redeemable_per_loan = Loan(loanContract).getRedeemableValue(loan_uuid, this);
        //the following will send the redeemed ether to this token contract
        //Loan(loanContract).redeemValue(loan_uuid, this);
        //CDOTransfer(cdo_id, this, recipient,this.balance);

        //        uint fraction_tokens_owned = cdos[cdo_id].token.balances[msg.sender].div(cdos[cdo_id].token.totalSupply);
        //        uint redeemableValue = redeemable_per_loan.mul(fraction_tokens_owned).sub(balances_redeemed_per_loan[recipient][cdo_id][0]);
        //        if (redeemableValue == 0) {
        //                throw;
        //        }

        //        balances_redeemed_per_loan[msg.sender][cdo_id][0] =
        //        balances_redeemed_per_loan[msg.sender][cdo_id][0].add(redeemableValue);
        //            to_send = to_send.add(redeemableValue);

    }




    function withdraw(bytes32 cdo_id) {
        uint i = 0;
        bytes32 loan_uuid = cdos[cdo_id].loan_uuids[i];
        uint fraction_tokens_owned = cdos[cdo_id].token.balances[msg.sender].div(cdos[cdo_id].token.totalSupply);
        uint redeemed = total_redeemed_per_cdo[cdo_id];
        uint to_send = redeemed.mul(fraction_tokens_owned);
        uint redeemed_by_sender = balances_redeemed_per_loan[msg.sender][cdo_id][loan_uuid];
        to_send.sub(redeemed_by_sender);
        //TODO: assert that to_send isn't 'negative'
        if (to_send == 0) {
            throw;
        }
        Withdrawal(cdo_id,to_send, msg.sender);
//        for (uint8 i = 0; i < cdos[cdo_id].loan_uuids.length; i++) { //(ensure there are only 5 loans)
            //bytes32 loan_uuid = cdos[cdo_id].loan_uuids[i];
//            uint redeemable_per_loan = Loan(loanContract).getRedeemableValue(loan_uuid, this);
//            to_send += redeemable_per_loan;
//
//
//            //the following will send the redeemed ether to this token contract
//            Loan(loanContract).redeemValue(loan_uuid, this);
//            uint fraction_tokens_owned = cdos[cdo_id].token.balances[tx.origin].div(cdos[cdo_id].token.totalSupply);
//            uint redeemableValue = redeemable_per_loan.mul(fraction_tokens_owned).sub(balances_redeemed_per_loan[recipient][cdo_id][i]);
            //            if (redeemableValue == 0) {
            //                throw;
            //            }
//
//            balances_redeemed_per_loan[msg.sender][cdo_id][i] =
//            balances_redeemed_per_loan[msg.sender][cdo_id][i].add(redeemableValue);
//
//        }
        msg.sender.transfer(to_send);
    }

    //TODO: implement getter functions
    //TODO: richer naming conventions for these
    function getLoanUUIDSFromID(bytes32 cdo_id) returns (bytes32[]) {
        return cdos[cdo_id].loan_uuids;
    }

    function getNumTokensFromID(bytes32 cdo_id) returns (uint) {
        return cdos[cdo_id].token.totalSupply;
    }

    function getMyBalanceFromID(bytes32 cdo_id) returns (uint) {
        return cdos[cdo_id].token.balances[msg.sender];
    }

    function() payable public {}
}