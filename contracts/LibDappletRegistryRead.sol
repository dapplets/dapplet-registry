// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./lib/LinkedList.sol";

import {ModuleInfo, StorageRef, VersionInfo, VersionInfoDto, DependencyDto} from "./Struct.sol";
import {AppStorage} from "./AppStorage.sol";

library LibDappletRegistryRead {
    using LinkedList for LinkedList.LinkedListUint32;

    function getListers(
        AppStorage storage s,
        uint256 offset,
        uint256 limit
    ) public view returns (address[] memory listers, uint256 total) {
        if (limit == 0) {
            limit = 20;
        }

        total = s.listers.length;

        if (limit > total - offset) {
            limit = total - offset;
        }

        listers = new address[](limit);

        for (uint256 i = 0; i < limit; i++) {
            listers[i] = s.listers[offset + i];
        }
    }

    function getListersByModule(
        AppStorage storage s,
        string memory moduleName,
        uint256 offset,
        uint256 limit
    ) public view returns (address[] memory out) {
        bytes32 mKey = keccak256(abi.encodePacked(moduleName));
        uint256 moduleIdx = s.moduleIdxs[mKey];
        require(moduleIdx != 0, "The module does not exist");

        (address[] memory listers, ) = getListers(s, offset, limit);

        address[] memory buf = new address[](limit);
        uint256 count = 0;

        for (uint256 i = 0; i < listers.length; ++i) {
            address lister = listers[i];
            bool contains = s.listingByLister[lister].contains(moduleIdx);

            if (contains) {
                buf[count] = lister;
                count++;
            }
        }

        out = new address[](count);
        for (uint256 i = 0; i < count; ++i) {
            out[i] = buf[i];
        }
    }

    function getVersionsByModule(
        AppStorage storage s,
        string memory name,
        string memory branch,
        uint256 offset,
        uint256 limit,
        bool reverse
    ) public view returns (VersionInfoDto[] memory versions, uint256 total) {
        bytes32 key = keccak256(abi.encodePacked(name, branch));
        bytes4[] memory versionNumbers = s.versionNumbers[key];

        if (limit == 0) {
            limit = 20;
        }

        total = versionNumbers.length;

        if (limit > total - offset) {
            limit = total - offset;
        }

        versions = new VersionInfoDto[](limit);

        for (uint256 i = 0; i < limit; i++) {
            uint256 idx = (reverse) ? (total - offset - 1 - i) : (offset + i);
            (versions[i], ) = getVersionInfo(
                s,
                name,
                branch,
                versionNumbers[idx]
            );
        }
    }

    function getModules(
        AppStorage storage s,
        string memory branch,
        uint256 offset,
        uint256 limit,
        bool reverse
    )
        external
        view
        returns (
            ModuleInfo[] memory modules,
            VersionInfoDto[] memory lastVersions,
            address[] memory owners,
            uint256 total
        )
    {
        if (limit == 0) {
            limit = 20;
        }

        total = s.modules.length - 1; // zero index is reserved

        if (limit > total - offset) {
            limit = total - offset;
        }

        modules = new ModuleInfo[](limit);
        lastVersions = new VersionInfoDto[](limit);
        owners = new address[](limit);

        for (uint256 i = 0; i < limit; i++) {
            uint256 idx = (reverse) ? (total - offset - i) : (offset + i + 1); // zero index is reserved
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
        uint256 limit,
        bool reverse
    )
        external
        view
        returns (
            ModuleInfo[] memory modulesInfo,
            VersionInfoDto[] memory lastVersionsInfo,
            uint256 total
        )
    {
        (uint256[] memory dappIndxs, uint256 totalNfts) = s
            ._dappletNFTContract
            .getModulesIndexes(userId, offset, limit, reverse);

        total = totalNfts;

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
        string memory branch,
        uint256 offset,
        uint256 limit,
        bool reverse
    )
        external
        view
        returns (
            ModuleInfo[] memory modules,
            VersionInfoDto[] memory lastVersions,
            address[] memory owners,
            uint256 total
        )
    {
        if (limit == 0) {
            limit = 20;
        }

        uint256[] memory moduleIndexes = s.listingByLister[lister].items();

        total = moduleIndexes.length;

        if (limit > total - offset) {
            limit = total - offset;
        }

        modules = new ModuleInfo[](limit);
        lastVersions = new VersionInfoDto[](limit);
        owners = new address[](limit);

        for (uint256 i = 0; i < limit; i++) {
            uint256 idx = (reverse) ? (total - offset - 1 - i) : (offset + i);
            uint256 mIdx = moduleIndexes[idx];
            modules[i] = s.modules[mIdx];
            lastVersions[i] = _getLastVersionInfo(s, modules[i].name, branch);
            owners[i] = s._dappletNFTContract.ownerOf(mIdx);
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
