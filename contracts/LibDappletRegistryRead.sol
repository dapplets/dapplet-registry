// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./lib/LinkedList.sol";

import {ModuleInfo, StorageRef, VersionInfo, VersionInfoDto, DependencyDto} from "./Struct.sol";
import {AppStorage} from "./AppStorage.sol";

library LibDappletRegistryRead {
    using LinkedList for LinkedList.LinkedListUint32;
    using EnumerableSet for EnumerableSet.UintSet;

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

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

        address[] memory buf = new address[](listers.length);
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

    function getModuleInfoByName(AppStorage storage s, string memory moduleName)
        external
        view
        returns (ModuleInfo memory modules, address owner)
    {
        bytes32 mKey = keccak256(abi.encodePacked(moduleName));
        require(s.moduleIdxs[mKey] != 0, "The module does not exist");
        modules = s.modules[s.moduleIdxs[mKey]];
        owner = s._dappletNFTContract.ownerOf(s.moduleIdxs[mKey]);
    }

    function getModulesByOwner(
        AppStorage storage s,
        address owner,
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
            uint256 total
        )
    {
        (uint256[] memory dappIndxs, uint256 totalNfts) = s
            ._dappletNFTContract
            .getModulesIndexes(owner, offset, limit, reverse);

        total = totalNfts;

        modules = new ModuleInfo[](dappIndxs.length);
        lastVersions = new VersionInfoDto[](dappIndxs.length);

        for (uint256 i = 0; i < dappIndxs.length; ++i) {
            modules[i] = s.modules[dappIndxs[i]];
            lastVersions[i] = _getLastVersionInfo(s, modules[i].name, branch);
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

    function getModulesInfoByListersBatch(
        AppStorage storage s,
        string[] memory ctxIds,
        address[] memory listers,
        uint256 maxBufLen
    )
        public
        view
        returns (ModuleInfo[][] memory modules, address[][] memory owners)
    {
        modules = new ModuleInfo[][](ctxIds.length);
        owners = new address[][](ctxIds.length);

        for (uint256 i = 0; i < ctxIds.length; ++i) {
            uint256[] memory outbuf = new uint256[](
                maxBufLen > 0 ? maxBufLen : 1000
            );
            uint256 bufLen = _fetchModulesByUsersTag(
                s,
                ctxIds[i],
                listers,
                outbuf,
                0
            );

            modules[i] = new ModuleInfo[](bufLen);
            owners[i] = new address[](bufLen);

            for (uint256 j = 0; j < bufLen; ++j) {
                uint256 idx = outbuf[j];
                address owner = s._dappletNFTContract.ownerOf(idx);
                //ToDo: strip contentType indexes?
                modules[i][j] = s.modules[idx]; // WARNING! indexes are started from 1.
                owners[i][j] = owner;
            }
        }
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

    // -------------------------------------------------------------------------
    // Internal functions
    // -------------------------------------------------------------------------

    function _fetchModulesByUsersTag(
        AppStorage storage s,
        string memory ctxId,
        address[] memory listers,
        uint256[] memory outbuf,
        uint256 _bufLen
    ) internal view returns (uint256) {
        uint256 bufLen = _bufLen;
        bytes32 key = keccak256(abi.encodePacked(ctxId));
        uint256[] memory modIdxs = s.modsByContextType[key].values();

        //add if no duplicates in buffer[0..nn-1]
        for (uint256 j = 0; j < modIdxs.length; ++j) {
            uint256 modIdx = modIdxs[j];

            // k - index of duplicated element
            uint256 k = 0;
            for (; k < bufLen; ++k) {
                if (outbuf[k] == modIdx) break; //duplicate found
            }

            // ToDo: check what happens when duplicated element is in the end of outbuf

            //no duplicates found  -- add the module's index
            if (k != bufLen) continue;

            // add module if it is in the listings
            for (uint256 l = 0; l < listers.length; ++l) {
                if (s.listingByLister[listers[l]].contains(modIdx)) {
                    outbuf[bufLen++] = modIdx;
                }
            }

            uint256 prevBufLen = bufLen;

            ModuleInfo memory m = s.modules[modIdx];
            bufLen = _fetchModulesByUsersTag(
                s,
                m.name,
                listers,
                outbuf,
                bufLen
            ); // using index as a tag

            // ToDo: add interface as separate module to outbuf?
            for (uint256 l = 0; l < m.interfaces.length; ++l) {
                bufLen = _fetchModulesByUsersTag(
                    s,
                    m.interfaces[l],
                    listers,
                    outbuf,
                    bufLen
                );
            }

            // something depends on the current module
            if (bufLen != prevBufLen) {
                outbuf[bufLen++] = modIdx;
            }

            //ToDo: what if owner changes? CREATE MODULE ENS  NAMES! on creating ENS
        }

        return bufLen;
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
