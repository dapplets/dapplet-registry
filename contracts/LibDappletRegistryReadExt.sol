// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./lib/LinkedList.sol";

import {ModuleInfo, StorageRef, VersionInfo, VersionInfoDto, DependencyDto} from "./Struct.sol";
import {AppStorage} from "./AppStorage.sol";

library LibDappletRegistryReadExt {
    
    string internal constant _DEFAULT_BRANCH_NAME = "default";
    bytes32 internal constant _HEAD =
        0x321c2cb0b0673952956a3bfa56cf1ce4df0cd3371ad51a2c5524561250b01836; // keccak256(abi.encodePacked("H"))
    bytes32 internal constant _TAIL =
        0x846b7b6deb1cfa110d0ea7ec6162a7123b761785528db70cceed5143183b11fc; // keccak256(abi.encodePacked("T"))

    // -------------------------------------------------------------------------
    // View functions for external integrations
    // -------------------------------------------------------------------------
    
    function includesDependency(
        AppStorage storage s,
        string memory moduleName,
        string memory dependencyName
    ) public view returns (bool) {
        uint256 moduleIdx = _getModuleIdx(s, moduleName);
        bytes32 key = keccak256(abi.encodePacked(moduleIdx, _DEFAULT_BRANCH_NAME));
        bytes4[] memory versions = s.versionNumbers[key];

        bytes32 depNameHash = keccak256(abi.encodePacked(dependencyName));

        // ToDo: limit iterations (gas limit)
        for (uint256 i = 0; i < versions.length; i++) {
            bytes32 vKey = keccak256(
                abi.encodePacked(moduleIdx, _DEFAULT_BRANCH_NAME, versions[i])
            );
            VersionInfo memory moduleVi = s.versions[vKey];
            for (uint256 j = 0; j < moduleVi.dependencies.length; ++j) {
                VersionInfo memory depVi = s.versions[moduleVi.dependencies[j]];
                ModuleInfo memory depMod = s.modules[depVi.modIdx];

                // ToDo: use Merkle tree to check hash inclusiveness
                if (keccak256(abi.encodePacked(depMod.name)) == depNameHash) {
                    return true;
                }
            }
        }

        return false;
    }

    // -------------------------------------------------------------------------
    // Internal functions
    // -------------------------------------------------------------------------

    function _getModuleIdx(
        AppStorage storage s,
        string memory moduleName
    ) internal view returns (uint256) {
        bytes32 mKey = keccak256(abi.encodePacked(moduleName));

        if (mKey == _HEAD) {
            return 0x00000000;
        } else if (mKey == _TAIL) {
            return 0xFFFFFFFF;
        } else {
            uint256 moduleIdx = s.moduleIdxs[mKey];
            require(moduleIdx != 0, "The module does not exist");
            return moduleIdx;
        }
    }
}
