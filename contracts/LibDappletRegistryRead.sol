// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./lib/LinkedList.sol";

import {ModuleInfo, StorageRef, VersionInfo, VersionInfoDto, DependencyDto, SemVer} from "./Struct.sol";
import {AppStorage} from "./AppStorage.sol";

library LibDappletRegistryRead {
    using LinkedList for LinkedList.LinkedListUint32;

    function getVersionNumbers(
        AppStorage storage s,
        string memory name,
        string memory branch
    ) public view returns (SemVer[] memory out) {
        bytes32 key = keccak256(abi.encodePacked(name, branch));
        bytes storage versions = s.versionNumbers[key];
        uint256 versionCount = versions.length / 3; // 1 version is 3 bytes

        out = new SemVer[](versionCount);

        for (uint256 i = 0; i < versionCount; ++i) {
            out[i] = SemVer(
                uint8(versions[3 * i]),
                uint8(versions[3 * i + 1]),
                uint8(versions[3 * i + 2])
            );
        }
    }

    function getModules(
        AppStorage storage s,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            ModuleInfo[] memory modules,
            address[] memory owners,
            uint256 nextOffset,
            uint256 totalModules
        )
    {
        if (limit == 0) {
            limit = 20;
        }

        nextOffset = offset + limit;
        totalModules = s.modules.length;

        if (limit > totalModules - offset) {
            limit = totalModules - offset;
        }

        modules = new ModuleInfo[](limit);
        owners = new address[](limit);

        for (uint256 i = 0; i < limit; i++) {
            uint256 idx = offset + i + 1; // zero index is reserved
            modules[i] = s.modules[idx];
            owners[i] = s._dappletNFTContract.ownerOf(idx);
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

    function getModulesByOwner(
        AppStorage storage s,
        address userId,
        string memory branch,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            ModuleInfo[] memory modulesInfo,
            VersionInfoDto[] memory lastVersionsInfo,
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
        lastVersionsInfo = new VersionInfoDto[](dappIndxs.length);

        for (uint256 i = 0; i < dappIndxs.length; ++i) {
            modulesInfo[i] = s.modules[dappIndxs[i]];
            lastVersionsInfo[i] = getLastVersionInfo(s, modulesInfo[i].name, branch);
        }
    }

    function getVersionInfo(
        AppStorage storage s,
        string memory name,
        string memory branch,
        uint8 major,
        uint8 minor,
        uint8 patch
    ) public view returns (VersionInfoDto memory dto, uint8 moduleType) {
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

    function getLastVersionInfo(
        AppStorage storage s,
        string memory name,
        string memory branch
    ) public view returns (VersionInfoDto memory dto) {
        SemVer[] memory versions = getVersionNumbers(s, name, branch);
        if (versions.length > 0) {
            SemVer memory lastVersion = versions[versions.length - 1];
            (dto, ) = getVersionInfo(
                s,
                name,
                branch,
                lastVersion.major,
                lastVersion.minor,
                lastVersion.patch
            );
        }
    }

    function getModulesOfListing(AppStorage storage s, address lister)
        external
        view
        returns (ModuleInfo[] memory out)
    {
        uint256[] memory moduleIndexes = s.listingByLister[lister].items();
        out = new ModuleInfo[](moduleIndexes.length);

        for (uint256 i = 0; i < moduleIndexes.length; ++i) {
            out[i] = s.modules[moduleIndexes[i]];
        }
    }
}
