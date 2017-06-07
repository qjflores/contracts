pragma solidity ^0.4.8;


/**
 * @title AttestationLib
 * @dev The Attestable contract encapsulates the logic behind a contract
 *    in which a third party attests to something, e.g. trustworthiness
 *    creditworthiness, identity, etc.
 */
library AttestationLib {
  event Attested(bytes32 indexed _uuid, address indexed _attestor, uint256 _timestamp);

  struct Attestation {
    address attestor;
    // Attestations are represented as files pointed to by
    // IPFS multihashes -- i.e. /ipfs/<attestationCommitment>
    bytes attestationCommitment;
  }

  function setAttestor(Attestation storage self, address _attestor) {
    self.attestor = _attestor;
  }

  modifier req(bool required) {
    if (!required)
      throw;
    _;
  }

  /*
    @dev Allows attestors to attest to a contract. Attestations cannot}{}
    @param _attestationCommitment bytes IPFS Multihash of a file
      containing the attestation, such that the file could be
      retrieved at /ipfs/<_attestationCommitment>
  */
  function attest(Attestation storage self, bytes32 uuid, bytes _attestationCommitment)
                req(fromAttestor(self))
                req(beforeAttestedTo(self)) {
    self.attestationCommitment = _attestationCommitment;
    Attested(uuid, self.attestor, block.timestamp);
  }

  /**
   * @dev Throws if contract is not yet attested to.
   */
   function afterAttestedTo(Attestation storage self) returns (bool attestedTo) {
     return (self.attestationCommitment.length != 0);
   }

   /**
    * @dev Throws if contract is already attested to.
    */
   function beforeAttestedTo(Attestation storage self) returns (bool beforeAttestedTo) {
     return (self.attestationCommitment.length == 0);
   }

   /**
    * @dev Throws if sender is not attestor
    */
   function fromAttestor(Attestation storage self) returns (bool fromAttestor) {
     return (msg.sender == self.attestor);
   }
}
