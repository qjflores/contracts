var Loan = artifacts.require("./Loan.sol");

contract('Loan', function(accounts) {
  it("should deploy with the correct terms and RAA PK", function() {
    return Loan.deployed().then(function(instance) {

    })
  });
  // it("should allow an RAA to attest to the loan");
  // it("should allow an investor to fund the loan");
  // it("should not transfer the balance to the borrower if the loan is not fully funded")
  // it("should transfer balance to the borrower when the loan is funded");
  // it("should allow a borrower to repay a loan and prorate the loan correctly");
  // it("should allow a lender to transfer their stake");
})
