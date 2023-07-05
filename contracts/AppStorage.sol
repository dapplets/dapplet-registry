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
    mapping(bytes32 => bytes4[]) versionNumbers; // keccak(moduleIndex,branch) => <bytes4[]> versionNumbers
    mapping(uint256 => string[]) branches; // keccak(moduleIndex) => string[]
    mapping(bytes32 => VersionInfo) versions; // keccak(moduleIndex,branch,version) => VersionInfo>
    mapping(bytes32 => uint256) moduleIdxs; // key - keccak256(name) => value - index of element in "s.modules" array
    mapping(bytes32 => EnumerableSet.UintSet) modsByContextType; // key - keccak256(contextId, owner), value - index of element in "s.modules" array
    mapping(uint256 => EnumerableSet.AddressSet) adminsOfModules; // key - moduleIndex => EnumerableSet address for added, removed and get all address
    mapping(uint256 => EnumerableStringSet.StringSet) contextIdsOfModules; // key - moduleIndex => EnumerableSet
    mapping(address => LinkedList.LinkedListUint32) listingByLister;
}
