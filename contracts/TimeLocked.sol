pragma solidity ^0.4.8;


/**
 * @title TimeLocked
 * @dev The TimeLocked contract....
 */
contract TimeLocked {
   uint public timeLock;

   function TimeLocked(uint _timeLock) {
     timeLock = _timeLock;
   }

   modifier beforeTimeLock() {
     if (block.timestamp > timeLock) {
       throw;
     }
     _;
   }

   modifier afterTimeLock() {
     if (block.timestamp <= timeLock) {
       throw;
     }
     _;
   }
}
