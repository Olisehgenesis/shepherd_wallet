// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// Demo target. `ping` is the allowlisted agent action. `sweep` is high-risk
/// and does not move funds; the dangerous case is a value transfer the policy
/// never allowlisted.
contract ShepherdVault {
    event Pinged();

    function ping() external {
        emit Pinged();
    }

    function sweep() external {
        emit Pinged();
    }
}
