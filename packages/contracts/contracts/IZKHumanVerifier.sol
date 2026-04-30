// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Verifies a Semaphore membership proof that a DID controls a
/// valid WebAuthn credential. The actual Semaphore verifier is generated
/// from the circuit and deployed separately; this is the surface we depend on.
interface IZKHumanVerifier {
    /// @param did The DID being attested.
    /// @param scope Domain separator (e.g. keccak256("fos:human")).
    /// @param proof The Semaphore proof bytes (encoded SemaphoreProof struct).
    /// @return ok True if proof verifies and matches scope.
    function verifyHumanProof(
        string calldata did,
        uint256 scope,
        bytes calldata proof
    ) external view returns (bool ok);
}
