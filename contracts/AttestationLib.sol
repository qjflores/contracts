pragma solidity ^0.4.8;


/**
 * @title Attestable
 * @dev The Attestable contract encapsulates the logic behind a contract
 *    in which a third party attests to something, e.g. trustworthiness
 *    creditworthiness, identity, etc.
 */
library AttestationLib {
  event Attested(uint256 _timestamp);

  struct Attestation {
    address public attestor;
    // Attestations are represented as files pointed to by
    // IPFS multihashes -- i.e. /ipfs/<attestationCommitment>
    bytes public attestationCommitment;
  }

  function setAttestor(address _attestor) {
    self.attestor = _attestor;
  }

  /*
    @dev Allows attestors to attest to a contract. Attestations cannot}{}
    @param _attestationCommitment bytes IPFS Multihash of a file
      containing the attestation, such that the file could be
      retrieved at /ipfs/<_attestationCommitment>
  */
  function attest(bytes _attestationCommitment) onlyAttestor beforeAttestedTo {
    self.attestationCommitment = _attestationCommitment;
    Attested(block.timestamp);
  }

  /**
   * @dev Throws if contract is not yet attested to.
   */
   modifier afterAttestedTo() {
     if (self.attestationCommitment.length == 0) {
       throw;
     }
     _;
   }

   /**
    * @dev Throws if contract is already attested to.
    */
   modifier beforeAttestedTo() {
     if (self.attestationCommitment.length > 0) {
       throw;
     }
     _;
   }

   /**
    * @dev Throws if sender is not attestor
    */
   modifier onlyAttestor() {
     if (msg.sender != self.attestor) {
       throw;
     }
     _;
   }
}
