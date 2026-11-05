// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HegotaSupport} from "@forshtat/hegota-support/contracts/HegotaSupport.sol";
import {Devnet} from "@forshtat/hegota-support/contracts/Devnet.sol";
import {Scope, SigParam, FrameParam, FrameMode, TxParam} from "@forshtat/hegota-support/contracts/Params.sol";
import {ShepherdPolicy} from "./ShepherdPolicy.sol";
import {ShepherdRules} from "./ShepherdRules.sol";

/// EIP-8141 account. `fallback` is the VERIFY frame.
///
/// Empty VERIFY data: the protocol signer must be `owner`. No external SLOAD,
/// so this path can stake and manage keys while unstaked.
/// VERIFY data `0x01` or `0x02`: the signer must be an active session. The
/// account reads `ShepherdPolicy` (external storage). `0x02` also requires
/// frame 0 to target the canonical expiry verifier.
///
/// `TIMESTAMP` is not used. OP-011 bans it in validation, and the expiry
/// frame's own data is hidden from this frame. Revoke is the kill switch.
contract ShepherdAccount is HegotaSupport(Devnet.ERC8421_WORKSHOP) {
    address public constant EXPIRY_VERIFIER = 0x81413f0cF12e9b6a49B1D0439E081c577D57FfFf;

    address public immutable owner;
    address public immutable policy;
    address public immutable registry;

    struct Session {
        uint64 expiry;
        uint256 valueCap;
        bool active;
    }

    mapping(address => Session) public sessions;
    address public p256Cosigner;

    error BadSigner();
    error NoExecution();
    error ExpiredFrame();
    error NotSelf();

    constructor(address owner_, address policy_, address registry_) payable {
        owner = owner_;
        policy = policy_;
        registry = registry_;
    }

    /// Top up. A plain transfer has empty calldata and hits `fallback`, which
    /// needs a frame and reverts. Call this with data instead.
    function fund() external payable {}

    function grantSession(address key, uint64 expiry, uint256 valueCap) external {
        if (msg.sender != address(this)) revert NotSelf();
        sessions[key] = Session({expiry: expiry, valueCap: valueCap, active: true});
    }

    function revokeSession(address key) external {
        if (msg.sender != address(this)) revert NotSelf();
        sessions[key].active = false;
    }

    function setP256Cosigner(address who) external {
        if (msg.sender != address(this)) revert NotSelf();
        p256Cosigner = who;
    }

    function sessionOf(address key) external view returns (uint64 expiry, uint256 valueCap, bool active) {
        Session memory s = sessions[key];
        return (s.expiry, s.valueCap, s.active);
    }

    fallback() external payable {
        address signer = address(uint160(sigparam(0, SigParam.RESOLVED_SIGNER)));
        if (msg.data.length == 0) {
            if (signer != owner) revert BadSigner();
            approve(Scope.EXECUTION_AND_PAYMENT);
            return;
        }
        if (msg.data.length != 1 || (msg.data[0] != 0x01 && msg.data[0] != 0x02)) revert BadSigner();
        if (msg.data[0] == 0x02) {
            address first = address(uint160(frameparam(0, FrameParam.RESOLVED_TARGET)));
            if (first != EXPIRY_VERIFIER) revert ExpiredFrame();
        }

        Session memory session = sessions[signer];
        uint256 count = txparam(TxParam.FRAME_COUNT);
        bool sawSender = false;
        for (uint256 i = 0; i < count; i++) {
            uint256 mode = frameparam(i, FrameParam.MODE);
            if (mode == uint256(FrameMode.VERIFY)) {
                address target = address(uint160(frameparam(i, FrameParam.RESOLVED_TARGET)));
                if (target != address(this) && target != EXPIRY_VERIFIER) revert ShepherdRules.TargetDenied();
                continue;
            }
            if (mode != uint256(FrameMode.SENDER)) revert ShepherdRules.TargetDenied();
            sawSender = true;
            _checkSender(i, session);
        }
        if (!sawSender) revert NoExecution();
        approve(Scope.EXECUTION_AND_PAYMENT);
    }

    function _checkSender(uint256 i, Session memory session) internal view {
        address target = address(uint160(frameparam(i, FrameParam.RESOLVED_TARGET)));
        uint256 value = frameparam(i, FrameParam.VALUE);
        uint256 len = frameparam(i, FrameParam.DATA_LENGTH);
        bytes4 selector = bytes4(0);
        if (len >= 4) selector = bytes4(framedataload(0, i));
        uint8 rule = _rule(target, selector);
        bool cosigned = rule == ShepherdRules.HIGH && _hasCosign();
        ShepherdRules.check(session.active, value, session.valueCap, rule, cosigned);
    }

    function _rule(address target, bytes4 selector) internal view returns (uint8) {
        (bool ok, bytes memory ret) = policy.staticcall(
            abi.encodeWithSelector(ShepherdPolicy.readRule.selector, target, selector)
        );
        if (!ok || ret.length < 32) revert ShepherdRules.TargetDenied();
        return abi.decode(ret, (uint8));
    }

    function _hasCosign() internal view returns (bool) {
        if (txparam(TxParam.SIGNATURE_COUNT) < 2) return false;
        address second = address(uint160(sigparam(1, SigParam.RESOLVED_SIGNER)));
        if (second == owner) return true;
        return p256Cosigner != address(0) && second == p256Cosigner;
    }
}
