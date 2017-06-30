pragma solidity ^0.4.8;

/**
 * @title VersionRegsiter
 *
 * @dev Simple register for exposing current and previous Loan contract
 *      addresses.  Client libraries should always query the VersionRegister
 *      first before attempting to reach the Loan contract in order to receive
 *      the desired contract address.
 */

contract VersionRegister {
  mapping (bytes32 => address) versionMapping;
  address owner;

  modifier onlyOwner() {
    if (msg.sender != owner)
      throw;
    _;
  }

  function VersionRegister() {
    owner = msg.sender;
  }

  function getContractByVersion(bytes32 versionHash) returns (address) {
    return versionMapping[versionHash];
  }

  function updateVersionMapping(bytes32 versionHash, address contractAddress)
    onlyOwner
  {
    versionMapping[versionHash] = contractAddress;
  }
}
