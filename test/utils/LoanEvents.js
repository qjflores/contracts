module.exports = {
  LoanCreated(params) {
    return {
      event: 'LoanCreated',
      args: {
        uuid: params.uuid,
        borrower: params.borrower,
        attestor: params.attestor,
        blockNumber: params.blockNumber
      }
    }
  },

  LoanTermBegin(params) {
    return {
      event: 'LoanTermBegin',
      args: {
        uuid: params.uuid,
        borrower: params.borrower,
        investors: params.investors,
        blockNumber: params.blockNumber
      }
    }
  },

  LoanBidsRejected(params) {
    return {
      event: 'LoanBidsRejected',
      args: {
        uuid: params.uuid,
        borrower: params.borrower,
        blockNumber: params.blockNumber
      }
    }
  }
}
