// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./lib/EnumerableStringSet.sol";
import "./lib/LinkedList.sol";

import {ModuleInfo, StorageRef, VersionInfo} from "./Struct.sol";
import {DappletNFT} from "./DappletNFT.sol";

struct AppStorage {
    DappletNFT _dappletNFTContract;
    ModuleInfo[] modules;
    address[] listers;
    mapping(bytes32 => bytes4[]) versionNumbers; // keccak(name,branch) => <bytes4[]> versionNumbers
    mapping(bytes32 => string[]) branches; // keccak(name) => string[]
    mapping(bytes32 => VersionInfo) versions; // keccak(name,branch,version) => VersionInfo>
    mapping(bytes32 => uint256) moduleIdxs; // key - keccak256(name) => value - index of element in "s.modules" array
    mapping(bytes32 => EnumerableSet.UintSet) modsByContextType; // key - keccak256(contextId, owner), value - index of element in "s.modules" array
    mapping(bytes32 => EnumerableSet.AddressSet) adminsOfModules; // key - moduleName => EnumerableSet address for added, removed and get all address
    mapping(bytes32 => EnumerableStringSet.StringSet) contextIdsOfModules; // key - moduleName => EnumerableSet
    mapping(address => LinkedList.LinkedListUint32) listingByLister;
}
