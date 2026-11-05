// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ShepherdPolicy} from "../src/ShepherdPolicy.sol";
import {ShepherdRules} from "../src/ShepherdRules.sol";

contract RulesHarness {
    function check(bool active, uint256 value, uint256 cap, uint8 rule, bool cosigned) external pure {
        ShepherdRules.check(active, value, cap, rule, cosigned);
    }
}

contract ShepherdTest {
    function testDenyByDefault() public {
        ShepherdPolicy policy = new ShepherdPolicy(address(this));
        assert(policy.readRule(address(0xBEEF), bytes4(0x12345678)) == 0);
    }

    function testAdminSetsRule() public {
        ShepherdPolicy policy = new ShepherdPolicy(address(this));
        policy.setRule(address(0xBEEF), bytes4(0xA1B2C3D4), 1);
        assert(policy.readRule(address(0xBEEF), bytes4(0xA1B2C3D4)) == 1);
    }

    function testStrangerCannotSetRule() public {
        ShepherdPolicy policy = new ShepherdPolicy(address(0xCAFE));
        (bool ok,) = address(policy).call(
            abi.encodeWithSelector(ShepherdPolicy.setRule.selector, address(1), bytes4(0x11111111), uint8(1))
        );
        assert(!ok);
    }

    function testInjectedTargetBeatsValueCap() public {
        RulesHarness rules = new RulesHarness();
        (bool ok, bytes memory ret) = address(rules).call(abi.encodeWithSelector(RulesHarness.check.selector, true, 10, 1, uint8(0), false));
        assert(!ok);
        assert(bytes4(ret) == ShepherdRules.TargetDenied.selector);
    }

    function testValueCapOnAllowlistedTarget() public {
        RulesHarness rules = new RulesHarness();
        (bool ok, bytes memory ret) = address(rules).call(abi.encodeWithSelector(RulesHarness.check.selector, true, 10, 1, uint8(1), false));
        assert(!ok);
        assert(bytes4(ret) == ShepherdRules.ValueCap.selector);
    }

    function testHighRiskWaitsForCosign() public {
        RulesHarness rules = new RulesHarness();
        (bool ok, bytes memory ret) = address(rules).call(abi.encodeWithSelector(RulesHarness.check.selector, true, 0, 1, uint8(2), false));
        assert(!ok);
        assert(bytes4(ret) == ShepherdRules.NeedsCosign.selector);
        rules.check(true, 0, 1, 2, true);
    }

    function testInactiveSession() public {
        RulesHarness rules = new RulesHarness();
        (bool ok, bytes memory ret) = address(rules).call(abi.encodeWithSelector(RulesHarness.check.selector, false, 0, 1, uint8(1), false));
        assert(!ok);
        assert(bytes4(ret) == ShepherdRules.SessionInactive.selector);
    }
}
