// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IZKHumanVerifier} from "../IZKHumanVerifier.sol";

/// @notice Test-only verifier. Returns the `accepts` flag verbatim so tests
/// can simulate both valid and invalid Semaphore proofs.
contract MockHumanVerifier is IZKHumanVerifier {
    bool public accepts = true;

    function setAccepts(bool v) external {
        accepts = v;
    }

    function verifyHumanProof(
        string calldata,
        uint256,
        bytes calldata
    ) external view returns (bool) {
        return accepts;
    }
}
