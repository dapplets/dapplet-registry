// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

// Import EnumerableSet from the OpenZeppelin Contracts library
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./lib/EnumerableStringSet.sol";
import "./lib/LinkedList.sol";

import {DappletNFT} from "./DappletNFT.sol";
import {ModuleInfo, StorageRef, VersionInfo, VersionInfoDto, DependencyDto, SemVer} from "./Struct.sol";
import {LibDappletRegistryRead} from "./LibDappletRegistryRead.sol";
import {AppStorage} from "./AppStorage.sol";

struct LinkString {
    string prev;
    string next;
}

contract DappletRegistry {
    using EnumerableSet for EnumerableSet.AddressSet;
    using LinkedList for LinkedList.LinkedListUint32;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableStringSet for EnumerableStringSet.StringSet;
    using LinkedList for LinkedList.LinkedListUint32;

    bytes32 internal constant _HEAD =
        0x321c2cb0b0673952956a3bfa56cf1ce4df0cd3371ad51a2c5524561250b01836; // keccak256(abi.encodePacked("H"))
    bytes32 internal constant _TAIL =
        0x846b7b6deb1cfa110d0ea7ec6162a7123b761785528db70cceed5143183b11fc; // keccak256(abi.encodePacked("T"))

    event ModuleInfoAdded(
        string[] contextIds,
        address owner,
        uint256 moduleIndex
    );

    AppStorage internal s;

    constructor(address _dappletNFTContractAddress) {
        s.modules.push(); // Zero index is reserved
        s._dappletNFTContract = DappletNFT(_dappletNFTContractAddress);
    }

    // -------------------------------------------------------------------------
    // Modificators
    // -------------------------------------------------------------------------

    modifier onlyModuleOwner(string memory name) {
        uint256 moduleIdx = _getModuleIdx(name);
        require(
            s._dappletNFTContract.ownerOf(moduleIdx) == msg.sender,
            "You are not the owner of this module"
        );
        _;
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    function getListingSize(address lister) public view returns (uint256) {
        return s.listingByLister[lister].size;
    }

    function getModulesOfListing(address lister)
        public
        view
        returns (ModuleInfo[] memory out)
    {
        return LibDappletRegistryRead.getModulesOfListing(s, lister);
    }

    function getListers() public view returns (address[] memory) {
        return s.listers;
    }

    function containsModuleInListing(address lister, string memory moduleName)
        public
        view
        returns (bool)
    {
        uint256 moduleIdx = _getModuleIdx(moduleName);
        return s.listingByLister[lister].contains(moduleIdx);
    }

    function getNFTContractAddress() public view returns (address) {
        return address(s._dappletNFTContract);
    }

    function getModuleIndx(string memory mod_name)
        public
        view
        returns (uint256 moduleIdx)
    {
        moduleIdx = _getModuleIdx(mod_name);
    }

    function getModulesInfoByListersBatch(
        string[] memory ctxIds,
        address[] memory listers,
        uint256 maxBufLen
    )
        public
        view
        returns (
            ModuleInfo[][] memory modulesInfos,
            address[][] memory ctxIdsOwners
        )
    {
        modulesInfos = new ModuleInfo[][](ctxIds.length);
        ctxIdsOwners = new address[][](ctxIds.length);

        for (uint256 i = 0; i < ctxIds.length; ++i) {
            uint256[] memory outbuf = new uint256[](
                maxBufLen > 0 ? maxBufLen : 1000
            );
            uint256 bufLen = _fetchModulesByUsersTag(
                ctxIds[i],
                listers,
                outbuf,
                0
            );

            modulesInfos[i] = new ModuleInfo[](bufLen);
            ctxIdsOwners[i] = new address[](bufLen);

            for (uint256 j = 0; j < bufLen; ++j) {
                uint256 idx = outbuf[j];
                address owner = s._dappletNFTContract.ownerOf(idx);
                //ToDo: strip contentType indexes?
                modulesInfos[i][j] = s.modules[idx]; // WARNING! indexes are started from 1.
                ctxIdsOwners[i][j] = owner;
            }
        }
    }

    function getModuleByIndex(uint256 index)
        public
        view
        returns (ModuleInfo memory)
    {
        return s.modules[index];
    }

    function getModules(
        string memory branch,
        uint256 offset,
        uint256 limit
    )
        public
        view
        returns (
            ModuleInfo[] memory modules,
            VersionInfoDto[] memory lastVersions,
            address[] memory owners,
            uint256 nextOffset,
            uint256 totalModules
        )
    {
        return LibDappletRegistryRead.getModules(s, branch, offset, limit);
    }

    function getModuleInfoByName(string memory mod_name)
        public
        view
        returns (ModuleInfo memory modulesInfo, address owner)
    {
        return LibDappletRegistryRead.getModuleInfoByName(s, mod_name);
    }

    function getModulesByOwner(
        address userId,
        string memory branch,
        uint256 offset,
        uint256 limit
    )
        public
        view
        returns (
            ModuleInfo[] memory modulesInfo,
            VersionInfoDto[] memory lastVersionsInfo,
            uint256 nextOffset,
            uint256 totalModules
        )
    {
        return
            LibDappletRegistryRead.getModulesByOwner(
                s,
                userId,
                branch,
                offset,
                limit
            );
    }

    function getBranchesByModule(string memory name)
        public
        view
        returns (string[] memory)
    {
        bytes32 mKey = keccak256(abi.encodePacked(name));
        return s.branches[mKey];
    }

    function getVersionNumbers(string memory name, string memory branch)
        public
        view
        returns (SemVer[] memory)
    {
        return LibDappletRegistryRead.getVersionNumbers(s, name, branch);
    }

    function getVersionInfo(
        string memory name,
        string memory branch,
        uint8 major,
        uint8 minor,
        uint8 patch
    ) public view returns (VersionInfoDto memory dto, uint8 moduleType) {
        return
            LibDappletRegistryRead.getVersionInfo(
                s,
                name,
                branch,
                major,
                minor,
                patch
            );
    }

    function getAdminsByModule(string memory mod_name)
        public
        view
        returns (address[] memory)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        return s.adminsOfModules[mKey].values();
    }

    function getContextIdsByModule(string memory mod_name)
        public
        view
        returns (string[] memory)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        return s.contextIdsOfModules[mKey].values();
    }

    // -------------------------------------------------------------------------
    // State modifying functions
    // -------------------------------------------------------------------------

    function changeMyListing(LinkString[] memory links) public {
        LinkedList.Link[] memory linksOfModuleIdxs = new LinkedList.Link[](
            links.length
        );

        for (uint256 i = 0; i < links.length; ++i) {
            uint256 prev = _getModuleIdx(links[i].prev);
            uint256 next = _getModuleIdx(links[i].next);

            linksOfModuleIdxs[i] = LinkedList.Link(prev, next);
        }

        LinkedList.LinkedListUint32 storage listing = s.listingByLister[
            msg.sender
        ];

        bool isNewListing = listing.linkify(linksOfModuleIdxs);
        if (isNewListing) {
            s.listers.push(msg.sender);
        }
    }

    function addModuleInfo(
        string[] memory contextIds,
        LinkString[] memory links,
        ModuleInfo memory mInfo,
        VersionInfoDto[] memory vInfos
    ) public {
        bytes32 mKey = keccak256(abi.encodePacked(mInfo.name));
        require(s.moduleIdxs[mKey] == 0, "The module already exists"); // module does not exist

        address owner = msg.sender;

        // ModuleInfo adding
        mInfo.flags = (vInfos.length == 0) // is under construction (no any version)
            ? (mInfo.flags | (uint256(1) << 0)) // flags[255] == 1
            : (mInfo.flags & ~(uint256(1) << 0)); // flags[255] == 0
        s.modules.push(mInfo);
        uint256 mIdx = s.modules.length - 1; // WARNING! indexes are started from 1.
        s.moduleIdxs[mKey] = mIdx;

        // ContextId adding
        for (uint256 i = 0; i < contextIds.length; ++i) {
            bytes32 key = keccak256(abi.encodePacked(contextIds[i]));
            s.modsByContextType[key].add(mIdx);
            s.contextIdsOfModules[mKey].add(contextIds[i]);
        }

        emit ModuleInfoAdded(contextIds, owner, mIdx);

        // Versions Adding
        for (uint256 i = 0; i < vInfos.length; ++i) {
            _addModuleVersionNoChecking(mKey, mIdx, mInfo.name, vInfos[i]);
        }

        // Creating Dapplet NFT
        s._dappletNFTContract.safeMint(owner, mIdx);

        // Update listings
        changeMyListing(links);
    }

    function editModuleInfo(
        string memory name,
        string memory title,
        string memory description,
        StorageRef memory fullDescription,
        StorageRef memory icon
    ) public {
        uint256 moduleIdx = _getModuleIdx(name);
        ModuleInfo storage m = s.modules[moduleIdx]; // WARNING! indexes are started from 1.
        require(
            s._dappletNFTContract.ownerOf(moduleIdx) == msg.sender,
            "You are not the owner of this module"
        );

        m.title = title;
        m.description = description;
        m.fullDescription = fullDescription;
        m.icon = icon;
    }

    function addModuleVersion(
        string memory mod_name,
        VersionInfoDto memory vInfo
    ) public {
        // ******** TODO: check existing versions and version sorting
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        uint256 moduleIdx = _getModuleIdx(mod_name);
        require(
            s._dappletNFTContract.ownerOf(moduleIdx) == msg.sender ||
                s.adminsOfModules[mKey].contains(msg.sender) == true,
            "You are not the owner of this module"
        );

        _addModuleVersionNoChecking(mKey, moduleIdx, mod_name, vInfo);
    }

    function addModuleVersionBatch(
        string[] memory mod_name,
        VersionInfoDto[] memory vInfo
    ) public {
        require(
            mod_name.length == vInfo.length,
            "Number of elements must be equal"
        );
        for (uint256 i = 0; i < mod_name.length; ++i) {
            addModuleVersion(mod_name[i], vInfo[i]);
        }
    }

    function addContextId(string memory mod_name, string memory contextId)
        public
        onlyModuleOwner(mod_name)
    {
        uint256 moduleIdx = _getModuleIdx(mod_name);

        bytes32 key = keccak256(abi.encodePacked(contextId));
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));

        // ContextId adding
        s.modsByContextType[key].add(moduleIdx);
        s.contextIdsOfModules[mKey].add(contextId);
    }

    function removeContextId(string memory mod_name, string memory contextId)
        public
        onlyModuleOwner(mod_name)
    {
        uint256 moduleIdx = _getModuleIdx(mod_name);

        // // ContextId adding
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        bytes32 key = keccak256(abi.encodePacked(contextId));

        s.modsByContextType[key].remove(moduleIdx);
        s.contextIdsOfModules[mKey].remove(contextId);
    }

    function addAdmin(string memory mod_name, address admin)
        public
        onlyModuleOwner(mod_name)
        returns (bool)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        return s.adminsOfModules[mKey].add(admin);
    }

    function removeAdmin(string memory mod_name, address admin)
        public
        onlyModuleOwner(mod_name)
        returns (bool)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        return s.adminsOfModules[mKey].remove(admin);
    }

    // -------------------------------------------------------------------------
    // Internal functions
    // -------------------------------------------------------------------------

    // ctxId - URL or ContextType [IdentityAdapter]
    function _fetchModulesByUsersTag(
        string memory ctxId,
        address[] memory listers,
        uint256[] memory outbuf,
        uint256 _bufLen
    ) internal view returns (uint256) {
        uint256 bufLen = _bufLen;
        bytes32 key = keccak256(abi.encodePacked(ctxId));
        uint256[] memory modIdxs = s.modsByContextType[key].values();

        //add if no duplicates in buffer[0..nn-1]
        uint256 lastBufLen = bufLen; // 1) 0  2) 1
        for (uint256 j = 0; j < modIdxs.length; ++j) {
            uint256 modIdx = modIdxs[j];

            // k - index of duplicated element
            uint256 k = 0;
            for (; k < lastBufLen; ++k) {
                if (outbuf[k] == modIdx) break; //duplicate found
            }

            // ToDo: check what happens when duplicated element is in the end of outbuf

            //no duplicates found  -- add the module's index
            if (k == lastBufLen) {
                // add module if it is in the listings
                for (uint256 l = 0; l < listers.length; ++l) {
                    if (
                        s.listingByLister[listers[l]].contains(modIdx) == true
                    ) {
                        outbuf[bufLen++] = modIdx;
                    }
                }

                uint256 prevBufLen = bufLen;

                ModuleInfo memory m = s.modules[modIdx];
                bufLen = _fetchModulesByUsersTag(
                    m.name,
                    listers,
                    outbuf,
                    bufLen
                ); // using index as a tag

                // ToDo: add interface as separate module to outbuf?
                for (uint256 l = 0; l < m.interfaces.length; ++l) {
                    bufLen = _fetchModulesByUsersTag(
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
        }

        return bufLen;
    }

    function _addModuleVersionNoChecking(
        bytes32 moduleKey,
        uint256 moduleIdx,
        string memory mod_name,
        VersionInfoDto memory v
    ) private {
        bytes32[] memory deps = new bytes32[](v.dependencies.length);
        for (uint256 i = 0; i < v.dependencies.length; ++i) {
            DependencyDto memory d = v.dependencies[i];
            bytes32 dKey = keccak256(
                abi.encodePacked(d.name, d.branch, d.major, d.minor, d.patch)
            );
            require(s.versions[dKey].modIdx != 0, "Dependency doesn't exist");
            deps[i] = dKey;
        }

        bytes32[] memory interfaces = new bytes32[](v.interfaces.length);
        for (uint256 i = 0; i < v.interfaces.length; ++i) {
            DependencyDto memory interf = v.interfaces[i];
            bytes32 iKey = keccak256(
                abi.encodePacked(
                    interf.name,
                    interf.branch,
                    interf.major,
                    interf.minor,
                    interf.patch
                )
            );
            require(s.versions[iKey].modIdx != 0, "Interface doesn't exist");
            interfaces[i] = iKey;

            // add interface name to ModuleInfo if not exist
            bool isInterfaceExist = false;
            for (
                uint256 j = 0;
                j < s.modules[moduleIdx].interfaces.length;
                ++j
            ) {
                if (
                    keccak256(
                        abi.encodePacked(s.modules[moduleIdx].interfaces[j])
                    ) == keccak256(abi.encodePacked(interf.name))
                ) {
                    isInterfaceExist = true;
                    break;
                }
            }

            if (isInterfaceExist == false) {
                s.modules[moduleIdx].interfaces.push(interf.name);
            }
        }

        VersionInfo memory vInfo = VersionInfo(
            moduleIdx,
            v.branch,
            v.major,
            v.minor,
            v.patch,
            v.binary,
            deps,
            interfaces,
            v.flags,
            v.extensionVersion,
            block.timestamp
        );
        bytes32 vKey = keccak256(
            abi.encodePacked(mod_name, v.branch, v.major, v.minor, v.patch)
        );
        s.versions[vKey] = vInfo;

        // add branch if not exists
        bytes32 nbKey = keccak256(abi.encodePacked(mod_name, vInfo.branch));
        if (s.versionNumbers[nbKey].length == 0) {
            s.branches[moduleKey].push(v.branch);
        }

        // add version number
        s.versionNumbers[nbKey].push(bytes1(vInfo.major));
        s.versionNumbers[nbKey].push(bytes1(vInfo.minor));
        s.versionNumbers[nbKey].push(bytes1(vInfo.patch));

        // reset IsUnderConstruction flag
        if (((s.modules[moduleIdx].flags >> 0) & uint256(1)) == 1) {
            s.modules[moduleIdx].flags =
                s.modules[moduleIdx].flags &
                ~(uint256(1) << 0);
        }
    }

    function _getModuleIdx(string memory mod_name)
        internal
        view
        returns (uint256)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));

        if (mKey == _HEAD) {
            return
                0x0000000000000000000000000000000000000000000000000000000000000000;
        } else if (mKey == _TAIL) {
            return
                0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
        } else {
            uint256 moduleIdx = s.moduleIdxs[mKey];
            require(moduleIdx != 0, "The module does not exist");
            return moduleIdx;
        }
    }
}
