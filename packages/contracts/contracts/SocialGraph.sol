// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SocialGraph — optional on-chain mute/block anchoring
/// @notice Mute and block are *always* client-side. This contract just lets
/// users optionally publish their personal block list so it travels across
/// devices and clients. It has no protocol-level censorship effect.
contract SocialGraph {
    /// @notice did => list of dids the caller blocks
    mapping(string => string[]) private _blocked;

    /// @notice did => blockedDid => index+1 (0 = not present)
    mapping(string => mapping(string => uint256)) private _index;

    event Blocked(string indexed blocker, string indexed blockedDid, uint256 timestamp);
    event Unblocked(string indexed blocker, string indexed blockedDid, uint256 timestamp);

    error NotBlocked();
    error AlreadyBlocked();

    /// @notice Anchor a block. Anyone can call on behalf of `caller` if the
    /// FreedomOfSpeech contract has authorized them — gating is upstream.
    function blockDid(string calldata caller, string calldata blockedDid) external {
        if (_index[caller][blockedDid] != 0) revert AlreadyBlocked();
        _blocked[caller].push(blockedDid);
        _index[caller][blockedDid] = _blocked[caller].length;
        emit Blocked(caller, blockedDid, block.timestamp);
    }

    /// @notice Remove a block.
    function unblockDid(string calldata caller, string calldata blockedDid) external {
        uint256 idx = _index[caller][blockedDid];
        if (idx == 0) revert NotBlocked();
        uint256 i = idx - 1;
        string[] storage list = _blocked[caller];
        uint256 last = list.length - 1;
        if (i != last) {
            string memory moved = list[last];
            list[i] = moved;
            _index[caller][moved] = i + 1;
        }
        list.pop();
        delete _index[caller][blockedDid];
        emit Unblocked(caller, blockedDid, block.timestamp);
    }

    /// @notice Read the full block list for a DID.
    function getBlocked(string calldata caller) external view returns (string[] memory) {
        return _blocked[caller];
    }

    /// @notice Whether `caller` has blocked `target`.
    function hasBlocked(string calldata caller, string calldata target) external view returns (bool) {
        return _index[caller][target] != 0;
    }
}
