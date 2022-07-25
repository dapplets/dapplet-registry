// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {ModuleInfo, StorageRef, VersionInfo} from "./Struct.sol";
import {DappletNFT} from "../DappletNFT.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./EnumerableStringSet.sol";
import "../Listings.sol";

struct AppStorage {
    ModuleInfo[] modules;
    mapping(bytes32 => bytes) versionNumbers; // keccak(name,branch) => <bytes4[]> versionNumbers
    mapping(bytes32 => VersionInfo) versions; // keccak(name,branch,major,minor,patch) => VersionInfo>
    mapping(bytes32 => uint32) moduleIdxs;
    // mapping(bytes32 => VersionInfo) public versions; // keccak(name,branch,major,minor,patch) => VersionInfo>
    mapping(bytes32 => EnumerableSet.UintSet) modsByContextType; // key - keccak256(contextId, owner), value - index of element in "s.modules" array
    mapping(bytes32 => EnumerableSet.AddressSet) adminsOfModules; // key - mod_name => EnumerableSet address for added, removed and get all address
    mapping(bytes32 => EnumerableStringSet.StringSet) contextIdsOfModules; // key - mod_name => EnumerableSet
    DappletNFT _dappletNFTContract;
    address[] listers;
    mapping(address => LinkedList.LinkedListUint32) listingByLister;
}
