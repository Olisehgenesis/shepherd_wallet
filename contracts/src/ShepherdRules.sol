// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// Opcode-free verdicts. The account gathers frame facts, then calls `check`.
/// Order: a forbidden target is reported before a value-cap miss, so an
/// injected drain is `TargetDenied` even when the value is also too high.
library ShepherdRules {
    uint8 internal constant DENY = 0;
    uint8 internal constant ALLOW = 1;
    uint8 internal constant HIGH = 2;

    error SessionInactive();
    error TargetDenied();
    error ValueCap();
    error NeedsCosign();

    function check(bool active, uint256 value, uint256 cap, uint8 rule, bool cosigned) internal pure {
        if (!active) revert SessionInactive();
        if (rule != ALLOW && rule != HIGH) revert TargetDenied();
        if (value > cap) revert ValueCap();
        if (rule == HIGH && !cosigned) revert NeedsCosign();
    }
}
