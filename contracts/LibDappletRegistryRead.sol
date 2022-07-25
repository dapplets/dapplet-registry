// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {ModuleInfo, StorageRef, VersionInfo, VersionInfoDto, DependencyDto} from "./Struct.sol";
import {AppStorage} from "./AppStorage.sol";

library LibDappletRegistryRead {
    function getModules(
        AppStorage storage s,
        // offset when receiving data
        uint256 offset,
        // limit on receiving items
        uint256 limit
    )
        external
        view
        returns (
            ModuleInfo[] memory result,
            uint256 nextOffset,
            uint256 totalModules
        )
    {
        nextOffset = offset + limit;
        totalModules = s.modules.length;

        if (limit == 0) {
            limit = 1;
        }

        if (offset == 0) {
            offset = 1;
        }

        if (limit > totalModules - offset) {
            limit = totalModules - offset;
        }

        result = new ModuleInfo[](limit);

        for (uint256 i = 0; i < limit; i++) {
            result[i] = s.modules[offset + i];
        }
    }

    function getModuleInfoByName(AppStorage storage s, string memory mod_name)
        external
        view
        returns (ModuleInfo memory modulesInfo, address owner)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        require(s.moduleIdxs[mKey] != 0, "The module does not exist");
        modulesInfo = s.modules[s.moduleIdxs[mKey]];
        owner = s._dappletNFTContract.ownerOf(s.moduleIdxs[mKey]);
    }

    function getModulesInfoByOwner(
        AppStorage storage s,
        address userId,
        // offset when receiving data
        uint256 offset,
        // limit on receiving items
        uint256 limit
    )
        external
        view
        returns (
            ModuleInfo[] memory modulesInfo,
            uint256 nextOffset,
            uint256 totalModules
        )
    {
        (
            uint256[] memory dappIndxs,
            uint256 nextOffsetFromNFT,
            uint256 totalModulesFromNFT
        ) = s._dappletNFTContract.getModulesIndexes(userId, offset, limit);

        nextOffset = nextOffsetFromNFT;
        totalModules = totalModulesFromNFT;
        modulesInfo = new ModuleInfo[](dappIndxs.length);
        for (uint256 i = 0; i < dappIndxs.length; ++i) {
            modulesInfo[i] = s.modules[dappIndxs[i]];
        }
    }

    function getVersionInfo(
        AppStorage storage s,
        string memory name,
        string memory branch,
        uint8 major,
        uint8 minor,
        uint8 patch
    ) external view returns (VersionInfoDto memory dto, uint8 moduleType) {
        bytes32 key = keccak256(
            abi.encodePacked(name, branch, major, minor, patch)
        );
        VersionInfo memory v = s.versions[key];
        require(v.modIdx != 0, "Version doesn't exist");
        DependencyDto[] memory deps = new DependencyDto[](
            v.dependencies.length
        );
        for (uint256 i = 0; i < v.dependencies.length; ++i) {
            VersionInfo memory depVi = s.versions[v.dependencies[i]];
            ModuleInfo memory depMod = s.modules[depVi.modIdx];
            deps[i] = DependencyDto(
                depMod.name,
                depVi.branch,
                depVi.major,
                depVi.minor,
                depVi.patch
            );
        }
        DependencyDto[] memory interfaces = new DependencyDto[](
            v.interfaces.length
        );
        for (uint256 i = 0; i < v.interfaces.length; ++i) {
            VersionInfo memory intVi = s.versions[v.interfaces[i]];
            ModuleInfo memory intMod = s.modules[intVi.modIdx];
            interfaces[i] = DependencyDto(
                intMod.name,
                intVi.branch,
                intVi.major,
                intVi.minor,
                intVi.patch
            );
        }
        dto = VersionInfoDto(
            v.branch,
            v.major,
            v.minor,
            v.patch,
            v.binary,
            deps,
            interfaces,
            v.flags,
            v.extensionVersion
        );
        moduleType = s.modules[v.modIdx].moduleType;
    }
}
