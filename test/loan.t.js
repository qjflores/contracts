import uuidV4 from 'uuid/V4';
import {web3, util} from './init.js';
import {PERIOD_TYPE} from './utils/Constants.js';
import LoanFactory from './utils/LoanFactory.js';
import expect from 'expect.js';

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

  const AUCTION_LENGTH_IN_BLOCKS = 10;
  const REVIEW_PERIOD_IN_BLOCKS = 5;

  let loan;
  let loanCreatedBlockNumber;

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

  describe('#fundLoan()', () => {

  })

  describe('#acceptTerms()', () => {

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
