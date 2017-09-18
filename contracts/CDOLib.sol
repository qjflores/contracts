pragma solidity ^0.4.8;

import "./RedeemableTokenLib.sol";


/**
 * @title Loan
 *
 * @dev Simple CDO implementation, with 1 tranche.
 * @dev Based on LoanLib.
 *
 */
library CDOLib {
    using RedeemableTokenLib for RedeemableTokenLib.Accounting;
    using SafeMath for uint;

    enum PeriodType { Daily, Weekly, Monthly, Yearly, FixedDate }

    /*
        MODIFIERS
      ========================================================================
    */

    modifier assert(bool condition) {
        if (!condition) {
            throw;
        }
        _;
    }

    modifier assertOr(bool conditionOne, bool conditionTwo) {
        if (!conditionOne && !conditionTwo){
            throw;
        }
        _;
    }

    struct CDO {
        RedeemableTokenLib.Accounting token;
        bytes32[] loan_uuids;
        mapping(bytes32 => uint) num_tokens_per_loan;
    //uint256 tranche;
    //TODO: implement the following
    //mapping (address => mapping(bytes32 => uint[])) balances_redeemed_per_loan;
    }
}
