import uuidV4 from 'uuid/V4';
import {web3, util} from './init.js';
import {PERIOD_TYPE, LOAN_STATE} from './utils/Constants.js';
import LoanFactory from './utils/LoanFactory.js';
import {LoanCreated, LoanTermBegin} from './utils/LoanEvents.js'
import expect from 'expect.js';
import Random from 'random-js';

const Loan = artifacts.require("./Loan.sol");

contract("Loan", (accounts) => {
  const TERMS_SCHEMA_VERSION = "0.1.0";
  const LOAN =  LoanFactory.generateSignedLoan({
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
  });
  const AUCTION_LENGTH_IN_BLOCKS = 20;
  const REVIEW_PERIOD_IN_BLOCKS = 40;
  const INVESTORS = accounts.slice(2,14);

  let loan;
  let loanCreatedBlockNumber;
  let bids = {};

  before(async () => {
    loan = await Loan.deployed();
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
        AUCTION_LENGTH_IN_BLOCKS,
        REVIEW_PERIOD_IN_BLOCKS
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

    it("should throw on a loan request with a duplicate UUID to be created", async() => {
      try {
        await loan.createLoan(
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
          AUCTION_LENGTH_IN_BLOCKS,
          REVIEW_PERIOD_IN_BLOCKS
        )
        expect().fail("should throw error");
      } catch (err) {
        util.assertThrowMessage(err);
      }
    })

    it("should throw on a loan request with a zero block auction length", async() => {
      try {
        await loan.createLoan(
          web3.sha3(uuidV4()),
          LOAN.borrower,
          LOAN.principal,
          LOAN.terms,
          LOAN.attestor,
          LOAN.attestorFee,
          LOAN.defaultRisk,
          LOAN.signature.r,
          LOAN.signature.s,
          LOAN.signature.v,
          0,
          REVIEW_PERIOD_IN_BLOCKS
        )
        expect().fail("should throw error");
      } catch (err) {
        util.assertThrowMessage(err);
      }
    })

    it("should throw on a loan request with a zero block review period length", async() => {
      try {
        await loan.createLoan(
          web3.sha3(uuidV4()),
          LOAN.borrower,
          LOAN.principal,
          LOAN.terms,
          LOAN.attestor,
          LOAN.attestorFee,
          LOAN.defaultRisk,
          LOAN.signature.r,
          LOAN.signature.s,
          LOAN.signature.v,
          AUCTION_LENGTH_IN_BLOCKS,
          0
        )
        expect().fail("should throw error");
      } catch (err) {
        util.assertThrowMessage(err);
      }
    })
  })

  describe('#getters', () => {
    it('should get borrower', async () => {
      const borrower = await loan.getBorrower.call(LOAN.uuid);
      expect(borrower).to.be(LOAN.borrower);
    })

    it('should get principal', async() => {
      const principal = await loan.getPrincipal.call(LOAN.uuid);
      expect(principal.equals(LOAN.principal)).to.be(true);
    })

    it('should get terms', async() => {
      const terms = await loan.getTerms.call(LOAN.uuid);
      expect(terms).to.be(LOAN.terms);
    })

    it('should get attestor', async() => {
      const attestor = await loan.getAttestor.call(LOAN.uuid);
      expect(attestor).to.be(LOAN.attestor);
    })

    it('should get attestorFee', async() => {
      const attestorFee = await loan.getAttestorFee.call(LOAN.uuid);
      expect(attestorFee.equals(LOAN.attestorFee)).to.be(true);
    })

    it('should get defaultRisk', async() => {
      const defaultRisk = await loan.getDefaultRisk.call(LOAN.uuid);
      expect(defaultRisk.equals(LOAN.defaultRisk)).to.be(true);
    })

    it('should get the ECDSA signature', async() => {
      const signature = await loan.getAttestorSignature.call(LOAN.uuid);
      expect(signature[0]).to.be(LOAN.signature.r);
      expect(signature[1]).to.be(LOAN.signature.s);
      expect(signature[2].equals(LOAN.signature.v)).to.be(true);
    })

    it('should get auction end block', async() => {
      const auctionEndBlock = await loan.getAuctionEndBlock.call(LOAN.uuid);
      const expectedAuctionEndBlock =
        loanCreatedBlockNumber + AUCTION_LENGTH_IN_BLOCKS;
      expect(auctionEndBlock.equals(expectedAuctionEndBlock)).to.be(true);
    })

    it('should get review period end block', async() => {
      const reviewPeriodEndBlock = await loan.getReviewPeriodEndBlock.call(LOAN.uuid);
      const expectedReviewPeriodEndBlock =
        loanCreatedBlockNumber + AUCTION_LENGTH_IN_BLOCKS + REVIEW_PERIOD_IN_BLOCKS;
      expect(reviewPeriodEndBlock.equals(expectedReviewPeriodEndBlock)).to.be(true);
    })

    it("should get entire data packet", async() => {
      const data = await loan.getData.call(LOAN.uuid);
      expect(data[0]).to.be(LOAN.borrower);
      expect(data[1].equals(LOAN.principal)).to.be(true);
      expect(data[2]).to.be(LOAN.terms);
      expect(data[3]).to.be(LOAN.attestor);
      expect(data[4].equals(LOAN.attestorFee)).to.be(true);
      expect(data[5].equals(LOAN.defaultRisk)).to.be(true);
    })
  })

  describe('#bid()', () => {
    it('should allow investors to bid during the auction period', async () => {
      await Promise.all(INVESTORS.map(async function(investor) {
        const amount = Random().real(0.2, 0.3);
        const minInterestRate = Random().real(0.1, 0.2);

        bids[investor] = {
          amount: web3.toWei(amount, 'ether'),
          minInterestRate: web3.toWei(minInterestRate, 'ether')
        }

        await loan.bid(
          LOAN.uuid,
          investor,
          bids[investor].minInterestRate,
          { from: investor, value: bids[investor].amount }
        )
      }))

      const numBids = await loan.getNumBids.call(LOAN.uuid);
      for (let i = 0; i < numBids; i++) {
        let bid = await loan.getBid.call(LOAN.uuid, i);
        let investor = bid[0];
        expect(bid[1].equals(bids[investor].amount)).to.be(true);
        expect(bid[2].equals(bids[investor].minInterestRate)).to.be(true);
      }
    })

    it('should throw if investor tries to bid twice', async () => {
      try {
        await loan.bid(
          LOAN.uuid,
          INVESTORS[0],
          web3.toWei(0.1, 'ether'),
          { from: INVESTORS[0], value: web3.toWei(0.1, 'ether') }
        )
        expect().fail("should throw error")
      } catch (err) {
        util.assertThrowMessage(err);
      }
    })

    it('should throw if borrower accepts terms before auction period ends', async () => {
      try {
        await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0,5),
          [web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
           web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
           web3.toWei(0.2, 'ether')],
          { from: LOAN.borrower })
        expect().fail("should throw error");
      } catch (err) {
        util.assertThrowMessage(err);
      }
    })

    it('should throw if borrower rejects terms before auction period ends', async () => {
      try {
        await loan.rejectBids(LOAN.uuid);
        expect().fail("should throw error");
      } catch (err) {
        util.assertThrowMessage(err);
      }
    })

    it('should not allow investors to bid after the auction period', async () => {
      try {
        await util.setBlockNumberForward(8);
        await loan.bid(
          LOAN.uuid,
          INVESTORS[0],
          web3.toWei(0.1, 'ether'),
          { from: INVESTORS[0], value: web3.toWei(0.1, 'ether') }
        )
        expect().fail("should throw error")
      } catch (err) {
        util.assertThrowMessage(err)
      }
    })
  })

  describe('#acceptTerms()', () => {
    it ("should throw when non-borrower tries to accept terms", async () => {
      try {
        await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 5),
          [web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
           web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
           web3.toWei(0.2, 'ether')],
          { from: LOAN.attestor })
        expect().fail("should throw error");
      } catch (err) {
        util.assertThrowMessage(err);
      }
    })

    it ('should throw when borrower accepts w/o full principal raised', async () => {
      try {
        await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 3), [web3.toWei(0.1, 'ether'),
          web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether')],
          { from: LOAN.borrower })
        expect().fail("should throw error");
      } catch (err) {
        util.assertThrowMessage(err);
      }
    })

    it ('should throw when borrower accepts w/ > full principal amount', async () => {
      try {
        await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 6),
          [web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
           web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
           web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether')],
          { from: LOAN.borrower })
        expect().fail("should throw error");
      } catch (err) {
        util.assertThrowMessage(err);
      }
    })

    it ('should throw when borrower accepts w/ > non-investors', async () => {
      try {
        await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 4).concat(LOAN.attestor),
          [web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
           web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
           web3.toWei(0.2, 'ether')],
          { from: LOAN.borrower })
        expect().fail("should throw error");
      } catch (err) {
        util.assertThrowMessage(err);
      }
    })

    it ('should throw when borrower accepts w/ > than any investor bid', async () => {
      try {
        await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 5),
          [web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
           web3.toWei(0.5, 'ether'), web3.toWei(0.05, 'ether'),
           web3.toWei(0.05, 'ether')],
          { from: LOAN.borrower })
        expect().fail("should throw error");
      } catch (err) {
        util.assertThrowMessage(err);
      }
    })

    it ('should throw when borrower accepts w/ > 10 investors', async () => {
      try {
        await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 11),
          [web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
           web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
           web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
           web3.toWei(0.1, 'ether'), web3.toWei(0.1, 'ether'),
           web3.toWei(0.05, 'ether'), web3.toWei(0.05, 'ether'),],
          { from: LOAN.borrower })
        expect().fail("should throw error");
      } catch (err) {
        util.assertThrowMessage(err);
      }
    })

    it ('should allow borrower to accept w/ < 10 investors and full principal', async () => {
      const balanceBefore = web3.eth.getBalance(LOAN.borrower);

      const result = await loan.acceptBids(LOAN.uuid, INVESTORS.slice(0, 5),
        [web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
         web3.toWei(0.2, 'ether'), web3.toWei(0.2, 'ether'),
         web3.toWei(0.2, 'ether')],
        { from: LOAN.borrower, gas: 1000000 })

      const gasCosts = await util.getGasCosts(result);
      const balanceAfter = web3.eth.getBalance(LOAN.borrower);

      expect(balanceAfter.minus(balanceBefore).plus(gasCosts).equals(LOAN.principal))
        .to.be(true, "balance delta is not principal")

      const state = await loan.getState.call(LOAN.uuid);
      expect(state.equals(LOAN_STATE.ACCEPTED)).to.be(true, "wrong state");

      util.assertEventEquality(result.logs[0], LoanTermBegin({
        uuid: LOAN.uuid,
        borrower: LOAN.borrower,
        investors: INVESTORS.slice(0,5).join(','),
        blockNumber: result.receipt.blockNumber
      }))

      for (let i = 0; i < 5; i++) {
        let balance = await loan.balanceOf(LOAN.uuid, INVESTORS[i]);
        expect(balance.equals(web3.toWei(0.2, 'ether'))).to.be(true);
      }

      let nonInvestorBalance = await loan.balanceOf(LOAN.uuid, INVESTORS[5])
      expect(nonInvestorBalance.equals(0)).to.be(true);
    })
  })

  describe('#withdrawInvestment()', () => {

  })

  describe('#periodicRepayment()', () => {

  })

  describe('ERC20', () => {
    describe('#transfer()', () => {

    })

    describe('#balanceOf()', () => {

    })

    describe('#approve()', () => {

    })

    describe('#transferFrom()', () => {

    })

    describe('#allowance()', () => {

    })
  })

  describe('RedeemableToken', () => {
    describe('getRedeemableValue()', () => {

    })

    describe('redeemValue()', () => {

    })
  })
})
