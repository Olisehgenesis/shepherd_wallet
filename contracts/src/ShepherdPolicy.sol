// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// Allowlist living outside the account.
/// A slot here is not associated with the sender, so a VERIFY-time read is
/// `StorageReadNonSender` on the canonical mempool and needs a staked
/// alt-mempool entity (ERC-8421 STORAGE-032).
contract ShepherdPolicy {
    address public admin;

    /// 0 deny, 1 allow, 2 high-risk (needs a second protocol signature).
    mapping(bytes32 => uint8) public rule;

    error NotAdmin();
    error BadMode();

    constructor(address admin_) {
        admin = admin_;
    }

    function setRule(address target, bytes4 selector, uint8 mode) external {
        if (msg.sender != admin) revert NotAdmin();
        if (mode > 2) revert BadMode();
        rule[_key(target, selector)] = mode;
    }

    function readRule(address target, bytes4 selector) external view returns (uint8) {
        return rule[_key(target, selector)];
    }

    function _key(address target, bytes4 selector) internal pure returns (bytes32) {
        return keccak256(abi.encode(target, selector));
    }
}
