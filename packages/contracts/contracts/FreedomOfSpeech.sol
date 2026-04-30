// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IZKHumanVerifier} from "./IZKHumanVerifier.sol";

/// @title FreedomOfSpeech — decentralized comment protocol
/// @notice One human, one account. Comments live on IPFS; this contract
/// anchors metadata and enforces the "one verified human" invariant.
/// No platform-level ban, mute, or delete exists by design.
contract FreedomOfSpeech is EIP712, Ownable {
    struct Comment {
        bytes32 urlHash; // keccak256 of canonical URL
        string did; // author's W3C DID
        string cid; // IPFS CID of CommentContent
        uint256 timestamp;
        bytes32 parentId; // 0x0 for top-level
    }

    /// @notice EIP-712 typehash for a comment posting authorization.
    bytes32 private constant COMMENT_TYPEHASH =
        keccak256(
            "Comment(bytes32 urlHash,string cid,bytes32 parentId,uint256 nonce)"
        );

    /// @notice The ZK verifier responsible for proof-of-humanity.
    IZKHumanVerifier public verifier;

    /// @notice Domain scope for human-verification proofs.
    uint256 public constant HUMAN_SCOPE = uint256(keccak256("fos:human"));

    /// @notice urlHash => commentIds in the order they were posted.
    mapping(bytes32 => bytes32[]) private _threads;

    /// @notice commentId => Comment.
    mapping(bytes32 => Comment) public comments;

    /// @notice did => true if registered as a verified human.
    mapping(string => bool) public verifiedHumans;

    /// @notice did => signing-key recovery address (the EOA that ECDSA-signs
    /// on behalf of the DID, derived once from the WebAuthn credential).
    mapping(string => address) public didSigner;

    /// @notice Per-DID nonce for replay protection.
    mapping(string => uint256) public nonces;

    event HumanVerified(string indexed did, address indexed signer, uint256 timestamp);
    event CommentPosted(
        bytes32 indexed urlHash,
        bytes32 indexed commentId,
        string did,
        string cid,
        bytes32 parentId,
        uint256 timestamp
    );

    error NotVerifiedHuman();
    error InvalidProof();
    error InvalidSignature();
    error EmptyCID();
    error ParentNotInThread();
    error VerifierNotSet();

    constructor(address initialOwner) EIP712("FreedomOfSpeech", "1") Ownable(initialOwner) {}

    /// @notice The owner sets the ZK verifier on deploy / when rotating.
    function setVerifier(IZKHumanVerifier next) external onlyOwner {
        verifier = next;
    }

    /// @notice Register a DID as a verified human. ZK proof attests that the
    /// caller's Semaphore identity matches a WebAuthn credential bound to
    /// `signer`. After this call the DID can post comments by ECDSA-signing
    /// payloads with `signer`.
    /// @dev Anyone can call this — the proof carries the authorization, not
    /// msg.sender. A relayer typically pays the gas.
    function verifyHuman(
        string calldata did,
        address signer,
        bytes calldata zkProof
    ) external {
        if (address(verifier) == address(0)) revert VerifierNotSet();
        if (!verifier.verifyHumanProof(did, HUMAN_SCOPE, zkProof)) revert InvalidProof();
        verifiedHumans[did] = true;
        didSigner[did] = signer;
        emit HumanVerified(did, signer, block.timestamp);
    }

    /// @notice Post a comment. The DID's signer must have signed an EIP-712
    /// payload of (urlHash, cid, parentId, nonce).
    function postComment(
        string calldata did,
        bytes32 urlHash,
        string calldata cid,
        bytes32 parentId,
        bytes calldata signature
    ) external returns (bytes32 commentId) {
        if (!verifiedHumans[did]) revert NotVerifiedHuman();
        if (bytes(cid).length == 0) revert EmptyCID();
        if (parentId != bytes32(0) && comments[parentId].timestamp == 0) {
            revert ParentNotInThread();
        }

        uint256 nonce = nonces[did];
        bytes32 structHash = keccak256(
            abi.encode(COMMENT_TYPEHASH, urlHash, keccak256(bytes(cid)), parentId, nonce)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != didSigner[did]) revert InvalidSignature();

        unchecked {
            nonces[did] = nonce + 1;
        }

        commentId = keccak256(abi.encodePacked(did, urlHash, cid, block.timestamp, nonce));
        comments[commentId] = Comment({
            urlHash: urlHash,
            did: did,
            cid: cid,
            timestamp: block.timestamp,
            parentId: parentId
        });
        _threads[urlHash].push(commentId);

        emit CommentPosted(urlHash, commentId, did, cid, parentId, block.timestamp);
    }

    /// @notice Read the ordered comment ids for a URL.
    function getThread(bytes32 urlHash) external view returns (bytes32[] memory) {
        return _threads[urlHash];
    }

    /// @notice Length of the thread for a URL.
    function threadLength(bytes32 urlHash) external view returns (uint256) {
        return _threads[urlHash].length;
    }

    /// @notice EIP-712 domain separator (exposed for off-chain signing).
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @notice EIP-712 typehash (exposed for off-chain signing).
    function commentTypehash() external pure returns (bytes32) {
        return COMMENT_TYPEHASH;
    }
}
