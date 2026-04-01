// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/FortuneNFT.sol";

contract DeployFortuneNFT is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        FortuneNFT nft = new FortuneNFT();
        console.log("FortuneNFT deployed at:", address(nft));
        vm.stopBroadcast();
    }
}
