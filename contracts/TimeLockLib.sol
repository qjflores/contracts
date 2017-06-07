pragma solidity ^0.4.8;


/**
 * @title TimeLocked
 * @dev The TimeLocked contract encapsulates basic modifiers for any contract
 *    with time locked functionality.
 *    Note: block timestamps are by no means accurate in ethereum, but have
 *      an accepted margin error of 900 seconds, so timelocks should not be
 *      specified with an expectation of subhourly accuracy.
 */
library TimeLockLib {
   struct TimeLock {
     uint timeLock;
   }

   modifier req(bool required) {
     if (!required) {
       throw;
     }
     _;
   }

   function beforeTimeLock(TimeLock storage self) returns (bool beforeTimeLock) {
     return (block.timestamp <= self.timeLock);
   }

   function afterTimeLock(TimeLock storage self)  returns (bool afterTimeLock) {
     return (block.timestamp > self.timeLock);
   }
}
