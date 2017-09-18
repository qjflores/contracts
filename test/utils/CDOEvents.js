module.exports = {
    LoanContractLinked(params) {
        return {
            event: 'LoanContractLinked',
            args: {
                loan: params.loan
            }
        }
    },
    CDOCreated(params) {
        return {
            event: 'CDOCreated',
            args: {
                loan_uuids: params.loan_uuids,
                cdo_id: params.cdo_id,
                num_tokens: params.num_tokens,
                blockNumber: params.blockNumber
            }
        }
    },
    CDOValueRedeemed(params) {
        return {
            event: 'CDOValueRedeemed',
            args: {
                cdo_id: params.cdo_id,
                recipient: params.recipient
            }
        }
    },
    RVisNone(params) {
        return {
            event: 'RVisNone',
            args: {
                redeemable_per_loan: params.redeemable_per_loan,
                recipient: params.recipient
            }
        }
    }
}
