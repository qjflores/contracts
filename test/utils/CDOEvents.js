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
                blockNumber: params.blockNumber,
                cdoCreator: params.cdoCreator
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
    CDOTransfer(params) {
        return {
            event: 'CDOTransfer',
            args: {
                cdo_id: params.cdo_id,
                from: params.from,
                to: params.to,
                value: params.value
            }
        }
    }
}