import _ from 'lodash';
import uuidV4 from 'uuid/V4';
import {web3, util} from './init.js';
import {PERIOD_TYPE, LOAN_STATE} from './utils/Constants.js';
import LoanFactory from './utils/LoanFactory.js';
import CDOFactory from './utils/LoanFactory.js';

import {LoanCreated, LoanTermBegin,
    LoanBidsRejected, PeriodicRepayment,
    ValueRedeemed, Transfer, Approval} from './utils/LoanEvents.js'

import {LoanContractLinked, CDOCreated, CDOValueRedeemed, CDOTransfer} from './utils/CDOEvents.js'

import expect from 'expect.js';
import Random from 'random-js';

const Loan = artifacts.require("./Loan.sol");
const CDO = artifacts.require("./CDO.sol");

contract("Loan", (accounts) => {
    const TERMS_SCHEMA_VERSION = "0.1.0";
    const LOAN_DATA = {
        uuid: web3.sha3(uuidV4()),
        borrower: accounts[0],
        principal: web3.toWei(1, 'ether'),
        terms: {
            version: web3.sha3(TERMS_SCHEMA_VERSION),
            periodType: PERIOD_TYPE.WEEKLY,
            periodLength: 1,
            termLength: 4,
            compounded: true
        },
        attestor: accounts[1],
        attestorFee: web3.toWei(0.001, 'ether'),
        defaultRisk: web3.toWei(0.73, 'ether')
    };
    const LOAN = LoanFactory.generateSignedLoan(LOAN_DATA);
    const LOAN1_AUCTION_LENGTH_IN_BLOCKS = 20;
    const LOAN1_REVIEW_PERIOD_IN_BLOCKS = 32;

    //TODO: give some sense to the following
    const LOAN2_AUCTION_LENGTH_IN_BLOCKS = 30;
    const LOAN2_REVIEW_PERIOD_IN_BLOCKS = 42;

    const INVESTORS = accounts.slice(2, 9);

    //TODO: make this less stupdi
    const INVESTORS2 = [accounts[2],accounts[10], accounts[11], accounts[12], accounts[13], accounts[14], accounts[15]];

    let loan;
    let loanFactory;
    let loanCreatedBlockNumber;
    let bids = {};
    let gasCosts1;

    before(async () => {
        loan = await Loan.deployed();
        loanFactory = new LoanFactory(loan);
    })

    let cdo;
    before(async () => {
        cdo = await CDO.deployed();
    })

    describe("#createLoan()", () => {
        it("should successfuly create loan request", async () => {
            const result = await loan.createLoan(
                LOAN.uuid,
                LOAN.borrower,
                LOAN.principal,
                LOAN.terms,
                LOAN.attestor,
                LOAN.attestorFee,
                LOAN.defaultRisk,
                LOAN.signature.r,
                LOAN.signature.s,
                LOAN.signature.v,
                LOAN1_AUCTION_LENGTH_IN_BLOCKS,
                LOAN1_REVIEW_PERIOD_IN_BLOCKS
            )

            util.assertEventEquality(result.logs[0], LoanCreated({
                uuid: LOAN.uuid,
                borrower: LOAN.borrower,
                attestor: LOAN.attestor,
                blockNumber: result.receipt.blockNumber
            }))

            // Save the latest block in which the loan was created
            loanCreatedBlockNumber = result.receipt.blockNumber;

        });
    })

    describe('#loan1_getters', () => {
        it('should get borrower', async () => {
            const borrower = await loan.getBorrower.call(LOAN.uuid);
            expect(borrower).to.be(LOAN.borrower);
        })

        it('should get principal', async () => {
            const principal = await loan.getPrincipal.call(LOAN.uuid);
            expect(principal.equals(LOAN.principal)).to.be(true);
        })

        it('should get terms', async () => {
            const terms = await loan.getTerms.call(LOAN.uuid);
            expect(terms).to.be(LOAN.terms);
        })

        it('should get attestor', async () => {
            const attestor = await loan.getAttestor.call(LOAN.uuid);
            expect(attestor).to.be(LOAN.attestor);
        })

        it('should get attestorFee', async () => {
            const attestorFee = await loan.getAttestorFee.call(LOAN.uuid);
            expect(attestorFee.equals(LOAN.attestorFee)).to.be(true);
        })

        it('should get defaultRisk', async () => {
            const defaultRisk = await loan.getDefaultRisk.call(LOAN.uuid);
            expect(defaultRisk.equals(LOAN.defaultRisk)).to.be(true);
        })

        it('should get the ECDSA signature', async () => {
            const signature = await loan.getAttestorSignature.call(LOAN.uuid);
            expect(signature[0]).to.be(LOAN.signature.r);
            expect(signature[1]).to.be(LOAN.signature.s);
            expect(signature[2].equals(LOAN.signature.v)).to.be(true);
        })

        it('should get auction end block', async () => {
            const auctionEndBlock = await loan.getAuctionEndBlock.call(LOAN.uuid);
            const expectedAuctionEndBlock =
                loanCreatedBlockNumber + LOAN1_AUCTION_LENGTH_IN_BLOCKS;
            expect(auctionEndBlock.equals(expectedAuctionEndBlock)).to.be(true);
        })

        it('should get review period end block', async () => {
            const reviewPeriodEndBlock = await loan.getReviewPeriodEndBlock.call(LOAN.uuid);
            const expectedReviewPeriodEndBlock =
                loanCreatedBlockNumber + LOAN1_AUCTION_LENGTH_IN_BLOCKS + LOAN1_REVIEW_PERIOD_IN_BLOCKS;
            expect(reviewPeriodEndBlock.equals(expectedReviewPeriodEndBlock)).to.be(true);
        })

        it("should get entire data packet", async () => {
            const data = await loan.getData.call(LOAN.uuid);
            expect(data[0]).to.be(LOAN.borrower);
            expect(data[1].equals(LOAN.principal)).to.be(true);
            expect(data[2]).to.be(LOAN.terms);
            expect(data[3]).to.be(LOAN.attestor);
            expect(data[4].equals(LOAN.attestorFee)).to.be(true);
            expect(data[5].equals(LOAN.defaultRisk)).to.be(true);
        })
    })

    let loanCreatedBlockNumber2;
    let bids2 = {};

    const LOAN_DATA_2 = {
        uuid: web3.sha3(uuidV4()),
        borrower: accounts[9],
        principal: web3.toWei(1, 'ether'),
        terms: {
            version: web3.sha3(TERMS_SCHEMA_VERSION),
            periodType: PERIOD_TYPE.MONTHLY,
            periodLength: 1,
            termLength: 4,
            compounded: true
        },
        attestor: accounts[1],
        attestorFee: web3.toWei(0.001, 'ether'),
        defaultRisk: web3.toWei(0.73, 'ether')
    };

    const LOAN2 = LoanFactory.generateSignedLoan(LOAN_DATA_2);
    describe("#createLoan2()", () => {

        it("should successfuly create loan2 request", async () => {
            //TODO: make the auction and review period end blocks make sense
            const result2 = await loan.createLoan(
                LOAN2.uuid,
                LOAN2.borrower,
                LOAN2.principal,
                LOAN2.terms,
                LOAN2.attestor,
                LOAN2.attestorFee,
                LOAN2.defaultRisk,
                LOAN2.signature.r,
                LOAN2.signature.s,
                LOAN2.signature.v,
                LOAN2_AUCTION_LENGTH_IN_BLOCKS,
                LOAN2_REVIEW_PERIOD_IN_BLOCKS
            )

            util.assertEventEquality(result2.logs[0], LoanCreated({
                uuid: LOAN2.uuid,
                borrower: LOAN2.borrower,
                attestor: LOAN2.attestor,
                blockNumber: result2.receipt.blockNumber
            }))

            // Save the latest block in which the loan was created
            loanCreatedBlockNumber2 = result2.receipt.blockNumber;

        });
    })

    describe('#loan2_getters', () => {
        it('should get borrower', async () => {
            const borrower2 = await loan.getBorrower.call(LOAN2.uuid);
            expect(borrower2).to.be(LOAN2.borrower);
        })

        it('should get principal', async () => {
            const principal2 = await loan.getPrincipal.call(LOAN2.uuid);
            expect(principal2.equals(LOAN2.principal)).to.be(true);
        })

        it('should get terms', async () => {
            const terms2 = await loan.getTerms.call(LOAN2.uuid);
            expect(terms2).to.be(LOAN2.terms);
        })

        it('should get attestor', async () => {
            const attestor2 = await loan.getAttestor.call(LOAN2.uuid);
            expect(attestor2).to.be(LOAN2.attestor);
        })

        it('should get attestorFee', async () => {
            const attestorFee2 = await loan.getAttestorFee.call(LOAN2.uuid);
            expect(attestorFee2.equals(LOAN2.attestorFee)).to.be(true);
        })

        it('should get defaultRisk', async () => {
            const defaultRisk = await loan.getDefaultRisk.call(LOAN2.uuid);
            expect(defaultRisk.equals(LOAN2.defaultRisk)).to.be(true);
        })

        it('should get the ECDSA signature', async () => {
            const signature2 = await loan.getAttestorSignature.call(LOAN2.uuid);
            expect(signature2[0]).to.be(LOAN2.signature.r);
            expect(signature2[1]).to.be(LOAN2.signature.s);
            expect(signature2[2].equals(LOAN2.signature.v)).to.be(true);
        })

        it('should get auction end block', async () => {
            const auctionEndBlock2 = await loan.getAuctionEndBlock.call(LOAN2.uuid);
            const expectedAuctionEndBlock2 =
                loanCreatedBlockNumber2 + LOAN2_AUCTION_LENGTH_IN_BLOCKS;
            expect(auctionEndBlock2.equals(expectedAuctionEndBlock2)).to.be(true);
        })

        it('should get review period end block', async () => {
            const reviewPeriodEndBlock2 = await loan.getReviewPeriodEndBlock.call(LOAN2.uuid);
            const expectedReviewPeriodEndBlock2 =
                loanCreatedBlockNumber2 + LOAN2_AUCTION_LENGTH_IN_BLOCKS + LOAN2_REVIEW_PERIOD_IN_BLOCKS;
            expect(reviewPeriodEndBlock2.equals(expectedReviewPeriodEndBlock2)).to.be(true);
        })

        it("should get entire data packet", async () => {
            const data = await loan.getData.call(LOAN.uuid);
            expect(data[0]).to.be(LOAN.borrower);
            expect(data[1].equals(LOAN.principal)).to.be(true);
            expect(data[2]).to.be(LOAN.terms);
            expect(data[3]).to.be(LOAN.attestor);
            expect(data[4].equals(LOAN.attestorFee)).to.be(true);
            expect(data[5].equals(LOAN.defaultRisk)).to.be(true);
        })
    })

    describe('#loan1_bid()', () => {
        it('loan1 should allow investors to bid during the auction period', async () => {
            await Promise.all(INVESTORS.map(async function (investor) {
                const amount = Random().real(0.4, 0.6);
                const minInterestRate = Random().real(0.1, 0.2);

                bids[investor] = {
                    amount: web3.toWei(amount, 'ether'),
                    minInterestRate: web3.toWei(minInterestRate, 'ether')
                }

                await loan.bid(
                    LOAN.uuid,
                    investor,
                    bids[investor].minInterestRate,
                    {from: investor, value: bids[investor].amount}
                )
            }))

            const numBids = await loan.getNumBids.call(LOAN.uuid);
            for (let i = 0; i < numBids; i++) {
                let bid = await loan.getBidByIndex.call(LOAN.uuid, i);
                let investor = bid[0];
                expect(bid[1].equals(bids[investor].amount)).to.be(true);
                expect(bid[2].equals(bids[investor].minInterestRate)).to.be(true);
            }
        })

        it('loan1 should not allow investors to bid after the auction period', async () => {
            try {
                await util.setBlockNumberForward(8);
                await loan.bid(
                    LOAN.uuid,
                    INVESTORS[0],
                    web3.toWei(0.1, 'ether'),
                    {from: INVESTORS[0], value: web3.toWei(0.1, 'ether')}
                )
                expect().fail("should throw error")
            } catch (err) {
                util.assertThrowMessage(err)
            }
        })


    })

    describe('#loan1_acceptBids()', () => {
        it('should throw when borrower accepts w/ > full principal+fee amount', async () => {
            try {
                await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 6),
                    [web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
                        web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
                        web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether')],
                    {from: LOAN.borrower})
                expect().fail("should throw error");
            } catch (err) {
                util.assertThrowMessage(err);
            }
        })

        it('should throw when borrower accepts w/ non-investors', async () => {
            try {
                await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 4).concat(LOAN.attestor),
                    [web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
                        web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
                        web3.toWei(0.2, 'ether')],
                    {from: LOAN.borrower})
                expect().fail("should throw error");
            } catch (err) {
                util.assertThrowMessage(err);
            }
        })

        it('should throw when borrower accepts w/ > than any investor bid', async () => {
            try {
                await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 5),
                    [web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
                        web3.toWei(0.75, 'ether'), web3.toWei(0.025, 'ether'),
                        web3.toWei(0.025, 'ether')],
                    {from: LOAN.borrower})
                expect().fail("should throw error");
            } catch (err) {
                util.assertThrowMessage(err);
            }
        })

        it('should throw when borrower accepts w/ > 10 investors', async () => {
            try {
                await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 11),
                    [web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
                        web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
                        web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
                        web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
                        web3.toWei(0.05, 'ether'), web3.toWei(0.05, 'ether'),],
                    {from: LOAN.borrower})
                expect().fail("should throw error");
            } catch (err) {
                util.assertThrowMessage(err);
            }
        })

        it('should allow borrower to accept w/ < 10 investors and full principal+fee', async () => {
            const borrowerBalanceBefore = web3.eth.getBalance(LOAN.borrower);
            const attestorBalanceBefore = web3.eth.getBalance(LOAN.attestor);
            const bidAmountsAccepted = [
                web3.toWei(0.2, 'ether'),
                web3.toWei(0.2, 'ether'),
                web3.toWei(0.2, 'ether'),
                web3.toWei(0.2, 'ether'),
                web3.toWei(0.201, 'ether')
            ]

            const result = await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 5),
                bidAmountsAccepted, {from: LOAN.borrower})

            gasCosts1 = await util.getGasCosts(result);
            const borrowerBalanceAfter = web3.eth.getBalance(LOAN.borrower);
            const attestorBalanceAfter = web3.eth.getBalance(LOAN.attestor);

            expect(borrowerBalanceAfter
                .minus(borrowerBalanceBefore).plus(gasCosts1).equals(LOAN.principal))
                .to.be(true, "balance delta is not principal")

            expect(attestorBalanceAfter
                .minus(attestorBalanceBefore).equals(LOAN.attestorFee))
                .to.be(true, "attestor delta is not attestorFee")

            const state = await loan.getState.call(LOAN.uuid);
            expect(state.equals(LOAN_STATE.ACCEPTED)).to.be(true, "wrong state");

            util.assertEventEquality(result.logs[0], LoanTermBegin({
                uuid: LOAN.uuid,
                borrower: LOAN.borrower,
                blockNumber: result.receipt.blockNumber
            }))

            for (let i = 0; i < 5; i++) {
                const totalInvested =
                    web3.toBigNumber(LOAN.principal).plus(LOAN.attestorFee)
                const expectedBalance =
                    web3.toBigNumber(bidAmountsAccepted[i])
                        .times(LOAN.principal)
                        .div(totalInvested)
                        .trunc();

                let balance = await loan.balanceOf(LOAN.uuid, INVESTORS[i]);

                expect(balance.equals(expectedBalance)).to.be(true);
            }

            let nonInvestorBalance = await loan.balanceOf(LOAN.uuid, INVESTORS[5])
            expect(nonInvestorBalance.equals(0)).to.be(true);

            const acceptedBidsInterestRates =
                INVESTORS.slice(0, 5)
                    .map((investor) => {
                        return bids[investor].minInterestRate
                    })

            const expectedInterestRate = web3.BigNumber.max(acceptedBidsInterestRates)
            const acceptedInterestRate = await loan.getInterestRate.call(LOAN.uuid)
            expect(expectedInterestRate.equals(acceptedInterestRate)).to.be(true);
        })



        it('should throw if borrower tries to reject after accepting', async () => {
            try {
                await loan.rejectBids(LOAN.uuid);
                expect().fail("should throw error");
            } catch (err) {
                util.assertThrowMessage(err);
            }
        })
    })

    describe('#loan2_bid()', () => {
        it('loan2 should be in auction state', async () => {
            let state2 = await loan.getState.call(LOAN2.uuid);
            expect(state2.equals(LOAN_STATE.AUCTION)).to.be(true, "wrong state");
        })


        it('loan2 should allow investors to bid during the auction period', async () => {
            await Promise.all(INVESTORS2.map(async function (investor) {
                const amount2 = Random().real(0.4, 0.6);
                const minInterestRate2 = Random().real(0.1, 0.2);

                bids2[investor] = {
                    amount: web3.toWei(amount2, 'ether'),
                    minInterestRate: web3.toWei(minInterestRate2, 'ether')
                }

                await loan.bid(
                    LOAN2.uuid,
                    investor,
                    bids2[investor].minInterestRate,
                    {from: investor, value: bids2[investor].amount}
                )
            }))

            // const numBids2 = await loan.getNumBids.call(LOAN2.uuid);
            // for (let i = 0; i < numBids2; i++) {
            //     let bid2 = await loan.getBidByIndex.call(LOAN2.uuid, i);
            //     let investor2 = bid2[0];
            //     expect(bid2[1].equals(bids2[investor2].amount)).to.be(true);
            //     expect(bid2[2].equals(bids2[investor2].minInterestRate)).to.be(true);
            // }
        })


        // it('loan2 should not allow investors to bid after the auction period', async () => {
        //     try {
        //         await util.setBlockNumberForward(8);
        //         await loan.bid(
        //             LOAN2.uuid,
        //             INVESTORS2[0],
        //             web3.toWei(0.1, 'ether'),
        //             {from: INVESTORS2[0], value: web3.toWei(0.1, 'ether')}
        //         )
        //         expect().fail("should throw error")
        //     } catch (err) {
        //         util.assertThrowMessage(err)
        //     }
        // })
    })

    describe('#loan2_acceptBids()', () => {
        it('should throw when borrower accepts w/ > full principal+fee amount', async () => {
            try {
                await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 6),
                    [web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
                        web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
                        web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether')],
                    {from: LOAN.borrower})
                expect().fail("should throw error");
            } catch (err) {
                util.assertThrowMessage(err);
            }
        })

        it('should throw when borrower accepts w/ non-investors', async () => {
            try {
                await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 4).concat(LOAN.attestor),
                    [web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
                        web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
                        web3.toWei(0.2, 'ether')],
                    {from: LOAN.borrower})
                expect().fail("should throw error");
            } catch (err) {
                util.assertThrowMessage(err);
            }
        })

        it('should throw when borrower accepts w/ > than any investor bid', async () => {
            try {
                await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 5),
                    [web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
                        web3.toWei(0.75, 'ether'), web3.toWei(0.025, 'ether'),
                        web3.toWei(0.025, 'ether')],
                    {from: LOAN.borrower})
                expect().fail("should throw error");
            } catch (err) {
                util.assertThrowMessage(err);
            }
        })

        it('should throw when borrower accepts w/ > 10 investors', async () => {
            try {
                await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 11),
                    [web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
                        web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
                        web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
                        web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
                        web3.toWei(0.05, 'ether'), web3.toWei(0.05, 'ether'),],
                    {from: LOAN.borrower})
                expect().fail("should throw error");
            } catch (err) {
                util.assertThrowMessage(err);
            }
        })

        it('should allow borrower to accept w/ < 10 investors and full principal+fee', async () => {
            const borrowerBalanceBefore = web3.eth.getBalance(LOAN2.borrower);
            const attestorBalanceBefore = web3.eth.getBalance(LOAN2.attestor);
            const bidAmountsAccepted = [
                web3.toWei(0.2, 'ether'),
                web3.toWei(0.2, 'ether'),
                web3.toWei(0.2, 'ether'),
                web3.toWei(0.2, 'ether'),
                web3.toWei(0.201, 'ether')
            ]

            const result = await loan.acceptBids(LOAN2.uuid, INVESTORS2.slice(0, 5),
                bidAmountsAccepted, {from: LOAN2.borrower})

            let gasCosts2 = await util.getGasCosts(result);
            const borrowerBalanceAfter = web3.eth.getBalance(LOAN2.borrower);
            const attestorBalanceAfter = web3.eth.getBalance(LOAN2.attestor);

            expect(borrowerBalanceAfter
                .minus(borrowerBalanceBefore).plus(gasCosts2).equals(LOAN2.principal))
                .to.be(true, "balance delta is not principal")

            expect(attestorBalanceAfter
                .minus(attestorBalanceBefore).equals(LOAN2.attestorFee))
                .to.be(true, "attestor delta is not attestorFee")

            const state = await loan.getState.call(LOAN2.uuid);
            expect(state.equals(LOAN_STATE.ACCEPTED)).to.be(true, "wrong state");



            util.assertEventEquality(result.logs[0], LoanTermBegin({
                uuid: LOAN2.uuid,
                borrower: LOAN2.borrower,
                blockNumber: result.receipt.blockNumber
            }))

            for (let i = 0; i < 5; i++) {
                const totalInvested =
                    web3.toBigNumber(LOAN2.principal).plus(LOAN2.attestorFee)
                const expectedBalance =
                    web3.toBigNumber(bidAmountsAccepted[i])
                        .times(LOAN2.principal)
                        .div(totalInvested)
                        .trunc();

                let balance = await loan.balanceOf(LOAN2.uuid, INVESTORS2[i]);

                expect(balance.equals(expectedBalance)).to.be(true);
            }

            let nonInvestorBalance = await loan.balanceOf(LOAN.uuid, INVESTORS2[5])
            expect(nonInvestorBalance.equals(0)).to.be(true);

            const acceptedBidsInterestRates =
                INVESTORS2.slice(0, 5)
                    .map((investor) => {
                        return bids2[investor].minInterestRate
                    })

            const expectedInterestRate = web3.BigNumber.max(acceptedBidsInterestRates)
            const acceptedInterestRate = await loan.getInterestRate.call(LOAN2.uuid)
            expect(expectedInterestRate.equals(acceptedInterestRate)).to.be(true);
        })



        it('should throw if borrower tries to reject after accepting', async () => {
            try {
                await loan.rejectBids(LOAN2.uuid);
                expect().fail("should throw error");
            } catch (err) {
                util.assertThrowMessage(err);
            }
        })
    })

    describe('#periodicRepayment()', () => {
        it('loan should be in correct state', async () => {
            const state2 = await loan.getState.call(LOAN.uuid);
            expect(state2.equals(LOAN_STATE.ACCEPTED)).to.be(true, "wrong state");
        })

        describe("first repayment", async () => {
            before(async () => {
                await loan.periodicRepayment(LOAN.uuid,
                    {value: web3.toWei(.5, 'ether')})
            });

            //TODO: gasCosts1 should have value, this is a JS thing.
            const expectedInvestorOneRedeemable = web3.fromWei(web3.toBigNumber(LOAN.principal).sub(web3.toBigNumber(gasCosts1)).div(10),'ether');

            describe('getRedeemableValue() before', () => {
                it('should retrieve correct values', async () => {
                    const investorOneRedeemable =
                        await loan.getRedeemableValue
                            .call(LOAN.uuid, INVESTORS[1])

                    //TODO: beware of this .round() below; gas counts for discrepency
                    expect(web3.fromWei(web3.toBigNumber(investorOneRedeemable),'ether').mul(10).round(0,2).div(10).toString()).to.be(expectedInvestorOneRedeemable.toString());
                    //expect(investorOneRedeemable.equals(expectedInvestorOneRedeemable)).to.be(true)
                })
            })

            describe(' redeemValue()', () => {
                it('should redeem the correct amount for investor 1', async () => {
                    const balanceBefore = web3.eth.getBalance(INVESTORS[1])
                    const result = await loan.redeemValue(LOAN.uuid,
                        INVESTORS[1], {from: INVESTORS[1]});
                    const gasCosts = await util.getGasCosts(result);
                    const balanceAfter = web3.eth.getBalance(INVESTORS[1])
                    const amountRedeemed = balanceAfter.minus(balanceBefore).plus(gasCosts);

                    //TODO: beware of this .round() below; what counts for discrepency?
                    expect(web3.fromWei(amountRedeemed,'ether').round(1).toString()).to.be(expectedInvestorOneRedeemable.toString());
                    //TODO:this bellow fails

                })

            })
        })


    })

    describe('ERC20', () => {
        let erc20TestLoan = _.cloneDeep(LOAN_DATA);
        const bids = [
            {
                bidder: INVESTORS[0],
                amount: 0.2002,
                minInterestRate: 0.1
            },
            {
                bidder: INVESTORS[1],
                amount: 0.8008,
                minInterestRate: 0.1
            }
        ]
        const acceptedBids = [
            {
                bidder: INVESTORS[0],
                amount: 0.2002,
            },
            {
                bidder: INVESTORS[1],
                amount: 0.8008,
            }
        ]

        before(async () => {
            erc20TestLoan.uuid = web3.sha3(uuidV4());
            await loanFactory.generateAcceptedStateLoan(erc20TestLoan, bids, acceptedBids);
        })

        describe('#balanceOf()', () => {
            it('should expose the balanceOf endpoint', async () => {
                const expectedInvestorOneBalance = web3.toWei(0.2, 'ether');
                const expectedInvestorTwoBalance = web3.toWei(0.8, 'ether');

                const investorOneBalance =
                    await loan.balanceOf.call(erc20TestLoan.uuid, INVESTORS[0]);
                const investorTwoBalance =
                    await loan.balanceOf.call(erc20TestLoan.uuid, INVESTORS[1]);

                expect(investorOneBalance.equals(expectedInvestorOneBalance)).to.be(true)
                expect(investorTwoBalance.equals(expectedInvestorTwoBalance)).to.be(true)
            })
        })

        describe('#transfer()', () => {
            it('should allow a token holder to transfer their balance', async () => {
                const result = await loan.transfer(erc20TestLoan.uuid,
                    INVESTORS[1], web3.toWei(0.1, 'ether'), {from: INVESTORS[0]})

                const expectedInvestorOneBalance = web3.toWei(0.1, 'ether');
                const expectedInvestorTwoBalance = web3.toWei(0.9, 'ether');

                const investorOneBalance =
                    await loan.balanceOf.call(erc20TestLoan.uuid, INVESTORS[0]);
                const investorTwoBalance =
                    await loan.balanceOf.call(erc20TestLoan.uuid, INVESTORS[1]);

                expect(investorOneBalance.equals(expectedInvestorOneBalance)).to.be(true)
                expect(investorTwoBalance.equals(expectedInvestorTwoBalance)).to.be(true)

                util.assertEventEquality(result.logs[0], Transfer({
                    uuid: erc20TestLoan.uuid,
                    from: INVESTORS[0],
                    to: INVESTORS[1],
                    value: web3.toWei(0.1, 'ether'),
                    blockNumber: result.receipt.blockNumber
                }))
            })
            //
            // it('should not let holder transfer balance they do not have', async () => {
            //     try {
            //         await loan.transfer(erc20TestLoan.uuid,
            //             INVESTORS[1], web3.toWei(0.2, 'ether'), {from: INVESTORS[0]})
            //         expect().fail("should throw error");
            //     } catch (err) {
            //         util.assertThrowMessage(err);
            //     }
            // })
        })


        describe('#allowance()', () => {
            it('should expose the allowance endpoint', async () => {
                const allowance =
                    await loan.allowance(erc20TestLoan.uuid, INVESTORS[0], INVESTORS[1])
                expect(allowance.equals(0)).to.be(true);
            })
        })

        describe('#approve()', () => {
            it('should allow investor to approve usage of their funds', async () => {
                const result = await loan.approve(
                    erc20TestLoan.uuid,
                    INVESTORS[0],
                    web3.toWei(0.4, 'ether'),
                    {from: INVESTORS[1]}
                )

                const allowance =
                    await loan.allowance(erc20TestLoan.uuid, INVESTORS[1], INVESTORS[0])

                expect(allowance.equals(web3.toWei(0.4, 'ether'))).to.be(true);

                util.assertEventEquality(result.logs[0], Approval({
                    uuid: erc20TestLoan.uuid,
                    owner: INVESTORS[1],
                    spender: INVESTORS[0],
                    value: web3.toWei(0.4, 'ether'),
                    blockNumber: result.receipt.blockNumber
                }))
            })
        })

        describe('#transferFrom()', () => {
            it("should allow user to transfer from other user's approved funds", async () => {
                const result = await loan.transferFrom(erc20TestLoan.uuid, INVESTORS[1], INVESTORS[0],
                    web3.toWei(0.2, 'ether'), {from: INVESTORS[0]});

                const expectedInvestorOneBalance = web3.toWei(0.3, 'ether');
                const expectedInvestorTwoBalance = web3.toWei(0.7, 'ether');

                const investorOneBalance =
                    await loan.balanceOf.call(erc20TestLoan.uuid, INVESTORS[0]);
                const investorTwoBalance =
                    await loan.balanceOf.call(erc20TestLoan.uuid, INVESTORS[1]);

                expect(investorOneBalance.equals(expectedInvestorOneBalance)).to.be(true)
                expect(investorTwoBalance.equals(expectedInvestorTwoBalance)).to.be(true)

                util.assertEventEquality(result.logs[0], Transfer({
                    uuid: erc20TestLoan.uuid,
                    from: INVESTORS[1],
                    to: INVESTORS[0],
                    value: web3.toWei(0.2, 'ether'),
                    blockNumber: result.receipt.blockNumber
                }))
            })

            // it("should throw if user tries transfering from other user's unapproved funds", async () => {
            //     try {
            //         await loan.transferFrom(erc20TestLoan.uuid, INVESTORS[2], INVESTORS[0],
            //             web3.toWei(0.2, 'ether'), {from: INVESTORS[0]});
            //         expect().fail("should throw error");
            //     } catch (err) {
            //         util.assertThrowMessage(err);
            //     }
            // })
            //
            // it('should throw if user tries transfering more than they are approved', async () => {
            //     try {
            //         await loan.transferFrom(erc20TestLoan.uuid, INVESTORS[1], INVESTORS[0],
            //             web3.toWei(0.3, 'ether'), {from: INVESTORS[0]});
            //         expect().fail("should throw error");
            //     } catch (err) {
            //         util.assertThrowMessage(err);
            //     }
            // })
        })
    })

    const CDO_DATA = {
        cdo_id: web3.sha3(uuidV4()),
        creator: accounts[2],
        loan_uuids: [LOAN.uuid, LOAN2.uuid],
        num_tokens: 100,
    };

    var creator_loan1_bal;
    var creator_loan2_bal;

    describe('#createCDO()', () => {
        let creator_bal;

        it("should give CDO creator's correct loan1 balances", async () => {
            creator_loan1_bal = await loan.balanceOf.call(LOAN.uuid, accounts[2]);

            const totalInvested1 =
                web3.toBigNumber(LOAN.principal).plus(LOAN.attestorFee)
            const expectedBalance1 =
                web3.toBigNumber(web3.toWei(0.2, 'ether'))
                    .times(LOAN.principal)
                    .div(totalInvested1)
                    .trunc();

            let balance1 = await loan.balanceOf(LOAN.uuid, accounts[2]);
            expect(balance1.toString()).to.be(expectedBalance1.toString());
        })

        it("should give CDO creator's correct loan2 balances", async () => {
            creator_loan2_bal = await loan.balanceOf.call(LOAN2.uuid,accounts[2]);


            const totalInvested2 =
                web3.toBigNumber(LOAN2.principal).plus(LOAN2.attestorFee)
            const expectedBalance2 =
                web3.toBigNumber(web3.toWei(0.2, 'ether'))
                    .times(LOAN2.principal)
                    .div(totalInvested2)
                    .trunc();

            let balance2 = await loan.balanceOf(LOAN2.uuid, accounts[2]);
            expect(balance2.toString()).to.be(expectedBalance2.toString());
        })

        it("should allow user to link loan contract to this CDO", async () => {
            const result3 = await cdo.linkLoanContract(loan.address);
            util.assertEventEquality(result3.logs[0], LoanContractLinked({loan: loan.address}))

        })

        it("should allow user to createCDO", async () => {
            const result4 = await cdo.createCDO(CDO_DATA.loan_uuids, CDO_DATA.num_tokens, CDO_DATA.cdo_id, accounts[2],{from: accounts[2]});

            util.assertEventEquality(result4.logs[0], CDOCreated({
                loan_uuids: CDO_DATA.loan_uuids,
                cdo_id: CDO_DATA.cdo_id,
                num_tokens: CDO_DATA.num_tokens,
                blockNumber: result4.receipt.blockNumber,
                cdoCreator: accounts[2]
            }))
        })
    })

    describe('#cdo_getters()', () => {
        it("CDO should have correct num_tokens", async () => {
            var numtokens = await cdo.getNumTokensFromID.call(CDO_DATA.cdo_id);
            expect(numtokens.toString()).to.be(CDO_DATA.num_tokens.toString());
        })

        it("CDO creator should have all tokens", async () => {
            //cdo.call(cdos)[cdo_id].token.balances[msg.sender] = num_tokens;
            var creator_tokens = await cdo.getMyBalanceFromID.call(CDO_DATA.cdo_id, {from: accounts[2]});
            expect((web3.toBigNumber(creator_tokens)).toString()).to.be((100).toString());
        })

        // it("CDO should have all tokens", async () => {
        //
        //     const CDOContractRedeemable =
        //     await loan.getRedeemableValue.call(LOAN.uuid, cdo.address);
        // })
    })

    describe('#cdo()', () => {
        it(" CDO contract should've received tokens from loanContract", async () => {
            let contract_tokens_loan1 = await loan.balanceOf.call(LOAN.uuid, cdo.address);

            const totalInvested =
                web3.toBigNumber(LOAN.principal).plus(LOAN.attestorFee)
            const expected_balance =
                web3.toBigNumber(web3.toWei(0.2, 'ether'))
                    .times(LOAN.principal)
                    .div(totalInvested)
                    .trunc();

            expect(contract_tokens_loan1.toString()).to.be(expected_balance.toString());

            let contract_tokens_loan2 = await loan.balanceOf.call(LOAN2.uuid, cdo.address);
            const totalInvested2 =
                web3.toBigNumber(LOAN2.principal).plus(LOAN2.attestorFee)
            const expected_balance2 =
                web3.toBigNumber(web3.toWei(0.2, 'ether'))
                    .times(LOAN2.principal)
                    .div(totalInvested2)
                    .trunc();

            expect(contract_tokens_loan2.toString()).to.be(expected_balance2.toString());
        })

        before(async () => {
            await loan.periodicRepayment(LOAN.uuid,
                {value: web3.toWei(0.5, 'ether')})
        });

        it(" CDO holder should be able to redeem tokens from CDO", async () => {
            const totalInvested =
                web3.toBigNumber(LOAN.principal).plus(LOAN.attestorFee)
            const expectedCDOContractRedeemable =
                web3.toBigNumber(web3.toWei(0.2, 'ether'))
                    .times(LOAN.principal)
                    .div(totalInvested)
                    .trunc();
            const CDOContractRedeemable = await loan.getRedeemableValue.call(LOAN.uuid, cdo.address);
            expect(CDOContractRedeemable.toString()).to.be(expectedCDOContractRedeemable.toString())
        })

        it("CDO contract redeems the correct amount and sends it to correct recipient address", async () => {
            const res = await loan.getRedeemableValue.call(LOAN.uuid, cdo.address);
            const result5 = await cdo.redeemValue(CDO_DATA.cdo_id, accounts[2]);

            util.assertEventEquality(result5.logs[0], CDOValueRedeemed({
                cdo_id: CDO_DATA.cdo_id,
                recipient: accounts[2]
            }))

        })

         it("CDO creator can transfer CDO tokens to recipient", async () => {
            const result7 = await cdo.transfer(CDO_DATA.cdo_id, accounts[5], 50, {from: accounts[2]});

            util.assertEventEquality(result7.logs[0], CDOTransfer({
                cdo_id: CDO_DATA.cdo_id,
                from: accounts[2],
                to: accounts[5],
                value: 50
            }))


         })
    })
})