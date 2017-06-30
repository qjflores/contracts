const VersionRegister = artifacts.require("./VersionRegister.sol");

function assertThrows(promise, message, returnFn=null) {
  return promise.then(function(success) {
    // Call was successful, should have thrown
    assert.fail(true, false, message);
  }, function(error) {
    // hack for verifying throw occurred
    assert(error.toString().indexOf("out of gas") > -1 ||
      error.toString().indexOf("invalid JUMP") > -1,
      "call should have thrown");
    return returnFn;
  });
}

contract('VersionRegister', function(accounts) {
  const ADDR_ONE = '0xf41899f21a27d014a78c511d9eaf90d1a64146ae';
  const ADDR_TWO = '0x5631c2540e97b87fc2c9f42d2af2244f2f4e034f';
  const MALICIOUS_ADDR = '0xab7c74abC0C4d48d1bdad5DCB26153FC8780f83E';

  let versionRegister;

  it("should deploy without failing", function() {
    return VersionRegister.new({ from: accounts[0] }).then(function(instance) {
      versionRegister = instance;
    });
  })

  it("should allow owner to update contract version", function() {
    const versionHashOne = web3.sha3('0.1.0');
    const versionHashTwo = web3.sha3('0.1.1');
    return versionRegister.updateVersionMapping(versionHashOne, ADDR_ONE).then(function(result) {
      return versionRegister.getContractByVersion.call(versionHashOne);
    }).then(function(address) {
      assert.equal(address, ADDR_ONE);
      return versionRegister.updateVersionMapping(versionHashTwo, ADDR_TWO);
    }).then(function(result) {
      return versionRegister.getContractByVersion.call(versionHashTwo);
    }).then(function(address) {
      assert.equal(address, ADDR_TWO);
    })
  });

  it("should not allow non-owner to update contract version", function() {
    const maliciousVersionHash = web3.sha3('0.1.1');
    return assertThrows(
      versionRegister.updateVersionMapping(
        maliciousVersionHash,
        MALICIOUS_ADDR,
        { from: accounts[1] }
      )
    );
  })
})
