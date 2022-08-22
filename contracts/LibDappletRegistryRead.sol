// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./lib/LinkedList.sol";

import {ModuleInfo, StorageRef, VersionInfo, VersionInfoDto, DependencyDto} from "./Struct.sol";
import {AppStorage} from "./AppStorage.sol";

library LibDappletRegistryRead {
    using LinkedList for LinkedList.LinkedListUint32;

    function getVersionsByModule(
        AppStorage storage s,
        string memory name,
        string memory branch,
        uint256 offset,
        uint256 limit,
        bool reverse
    )
        public
        view
        returns (
            VersionInfoDto[] memory versions,
            uint256 nextOffset,
            uint256 total
        )
    {
        bytes32 key = keccak256(abi.encodePacked(name, branch));
        bytes4[] memory versionNumbers = s.versionNumbers[key];

        if (limit == 0) {
            limit = 20;
        }

        nextOffset = offset + limit; // ToDo: remove nextOffset?
        total = versionNumbers.length;

        if (limit > total - offset) {
            limit = total - offset;
        }

        versions = new VersionInfoDto[](limit);

        for (uint256 i = 0; i < limit; i++) {
            uint256 idx = (reverse)
                ? (total - offset - 1 - i)
                : (offset + i);
            (versions[i], ) = getVersionInfo(s, name, branch, versionNumbers[idx]);
        }
    }

    function getModules(
        AppStorage storage s,
        string memory branch,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            ModuleInfo[] memory modules,
            VersionInfoDto[] memory lastVersions,
            address[] memory owners,
            uint256 nextOffset,
            uint256 total
        )
    {
        if (limit == 0) {
            limit = 20;
        }

        nextOffset = offset + limit;
        total = s.modules.length;

        if (limit > total - offset) {
            limit = total - offset;
        }

        modules = new ModuleInfo[](limit);
        lastVersions = new VersionInfoDto[](limit);
        owners = new address[](limit);

        for (uint256 i = 0; i < limit; i++) {
            uint256 idx = offset + i + 1; // zero index is reserved
            modules[i] = s.modules[idx];
            lastVersions[i] = _getLastVersionInfo(s, modules[i].name, branch);
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
            uint256 total
        )
    {
        (
            uint256[] memory dappIndxs,
            uint256 nextOffsetFromNFT,
            uint256 totalModulesFromNFT
        ) = s._dappletNFTContract.getModulesIndexes(userId, offset, limit);

        nextOffset = nextOffsetFromNFT;
        total = totalModulesFromNFT;

        modulesInfo = new ModuleInfo[](dappIndxs.length);
        lastVersionsInfo = new VersionInfoDto[](dappIndxs.length);

        for (uint256 i = 0; i < dappIndxs.length; ++i) {
            modulesInfo[i] = s.modules[dappIndxs[i]];
            lastVersionsInfo[i] = _getLastVersionInfo(
                s,
                modulesInfo[i].name,
                branch
            );
        }
    }

    function getVersionInfo(
        AppStorage storage s,
        string memory name,
        string memory branch,
        bytes4 version
    ) public view returns (VersionInfoDto memory dto, uint8 moduleType) {
        bytes32 key = keccak256(abi.encodePacked(name, branch, version));
        VersionInfo memory v = s.versions[key];
        require(v.modIdx != 0, "Version doesn't exist");
        DependencyDto[] memory deps = new DependencyDto[](
            v.dependencies.length
        );
        for (uint256 i = 0; i < v.dependencies.length; ++i) {
            VersionInfo memory depVi = s.versions[v.dependencies[i]];
            ModuleInfo memory depMod = s.modules[depVi.modIdx];
            deps[i] = DependencyDto(depMod.name, depVi.branch, depVi.version);
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
                intVi.version
            );
        }
        dto = VersionInfoDto(
            v.branch,
            v.version,
            v.binary,
            deps,
            interfaces,
            v.flags,
            v.extensionVersion,
            v.createdAt
        );
        moduleType = s.modules[v.modIdx].moduleType;
    }

    function getModulesOfListing(
        AppStorage storage s,
        address lister,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            ModuleInfo[] memory modules,
            uint256 nextOffset,
            uint256 total
        )
    {
        if (limit == 0) {
            limit = 20;
        }

        uint256[] memory moduleIndexes = s.listingByLister[lister].items();

        nextOffset = offset + limit;
        total = moduleIndexes.length;

        if (limit > total - offset) {
            limit = total - offset;
        }

        modules = new ModuleInfo[](limit);

        for (uint256 i = 0; i < limit; i++) {
            modules[i] = s.modules[moduleIndexes[i + offset]];
        }
    }

    function _getLastVersionInfo(
        AppStorage storage s,
        string memory name,
        string memory branch
    ) internal view returns (VersionInfoDto memory dto) {
        bytes32 key = keccak256(abi.encodePacked(name, branch));
        bytes4[] memory versionNumbers = s.versionNumbers[key];

        if (versionNumbers.length > 0) {
            bytes4 lastVersion = versionNumbers[versionNumbers.length - 1];
            (dto, ) = getVersionInfo(s, name, branch, lastVersion);
        }
    }
}
