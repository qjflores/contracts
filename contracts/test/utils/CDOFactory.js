import stringify from 'json-stable-stringify';
import util from './Util';
import _ from 'lodash';
import Random from 'random-js';

class CDOFactory {
    constructor(contract) {
        this.contract = contract;
    }

    static generateCDO(contract) {
        const terms = CDOFactory._generateTermsByteString(contract.terms);
        let unsignedLoan = _.cloneDeep(contract);
        unsignedLoan.terms = terms;

        const cdoHash = web3.sha3(stringify(unsignedLoan));
        const attestorSignature = web3.eth.sign(unsignedLoan.attestor, cdoHash)
        unsignedLoan.signature = {
            r: '0x' + attestorSignature.slice(2, 66),
            s: '0x' + attestorSignature.slice(66, 130),
            v: '0x' + attestorSignature.slice(130, 132)
        }

        const signedLoan = unsignedLoan;
        return signedLoan;
    }

    async generateAuctionStateLoan(loan, auctionLength, reviewPeriod) {
        const signedLoan = LoanFactory.generateSignedLoan(loan);
        await this.contract.createLoan(
            signedLoan.uuid,
            signedLoan.borrower,
            signedLoan.principal,
            signedLoan.terms,
            signedLoan.attestor,
            signedLoan.attestorFee,
            signedLoan.defaultRisk,
            signedLoan.signature.r,
            signedLoan.signature.s,
            signedLoan.signature.v,
            auctionLength,
            reviewPeriod
        );
    }

    async generateReviewStateLoan(loan, bids) {
        await this.generateAuctionStateLoan(loan, bids.length, 100);
        for (let i = 0; i < bids.length; i++) {
            await this.contract.bid(
                loan.uuid,
                bids[i].bidder,
                web3.toWei(bids[i].minInterestRate, 'ether'),
                { value: web3.toWei(bids[i].amount, 'ether') }
            )
        }
    }

    async generateAcceptedStateLoan(loan, bids, acceptedBids) {
        await this.generateReviewStateLoan(loan, bids);
        await this.contract.acceptBids(
            loan.uuid,
            acceptedBids.map((bid) => { return bid.bidder }),
            acceptedBids.map((bid) => { return web3.toWei(bid.amount, 'ether') })
        )
    }

    async generateRejectedStateLoan(loan, bids) {
        await this.generateReviewStateLoan(loan, bids);
        await this.contract.rejectBids(loan.uuid);
    }
}

module.exports = LoanFactory
