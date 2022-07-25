// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

// Import EnumerableSet from the OpenZeppelin Contracts library
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./lib/EnumerableStringSet.sol";
import "./lib/LinkedList.sol";

import {DappletNFT} from "./DappletNFT.sol";
import {ModuleInfo, StorageRef, VersionInfo, VersionInfoDto, DependencyDto} from "./Struct.sol";
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

    bytes32 internal constant _HEAD = 0x321c2cb0b0673952956a3bfa56cf1ce4df0cd3371ad51a2c5524561250b01836; // keccak256(abi.encodePacked("H"))
    bytes32 internal constant _TAIL = 0x846b7b6deb1cfa110d0ea7ec6162a7123b761785528db70cceed5143183b11fc; // keccak256(abi.encodePacked("T"))

    event ModuleInfoAdded(
        string[] contextIds,
        address owner,
        uint32 moduleIndex
    );

    AppStorage internal s;

    constructor(address _dappletNFTContractAddress) {
        s.modules.push(); // Zero index is reserved
        s._dappletNFTContract = DappletNFT(_dappletNFTContractAddress);
    }

    // -------------------------------------------------------------------------
    // Modificators
    // -------------------------------------------------------------------------

    modifier onlyOwnerModule(string memory name) {
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

    function getLinkedListSize(address lister) public view returns (uint32) {
        return s.listingByLister[lister].size;
    }

    // uint32[] memory => string[] memory
    function getLinkedList(address lister)
        public
        view
        returns (string[] memory out)
    {
        uint32[] memory moduleIndexes = s.listingByLister[lister].items();
        out = new string[](moduleIndexes.length);

        for (uint256 i = 0; i < moduleIndexes.length; ++i) {
            out[i] = s.modules[moduleIndexes[i]].name;
        }
    }

    function getListers() public view returns (address[] memory) {
        return s.listers;
    }

    function containsModuleInListing(address lister, string memory moduleName)
        public
        view
        returns (bool)
    {
        uint32 moduleIdx = getModuleIndx(moduleName);
        return s.listingByLister[lister].contains(moduleIdx);
    }

    // +0.038 => 19.738
    function getNFTContractAddress() public view returns (address) {
        return address(s._dappletNFTContract);
    }

    // +0.160 => 19.898
    function getModuleIndx(string memory mod_name)
        public
        view
        returns (uint32 moduleIdx)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        
        if (mKey == _HEAD) {
            moduleIdx = 0x00000000;
        } else if (mKey == _TAIL) {
            moduleIdx = 0xFFFFFFFF;
        } else {
            moduleIdx = s.moduleIdxs[mKey];
        }
    }

    function getModulesInfoByListersBatch(
        string[] memory ctxIds,
        address[] memory listers,
        uint32 maxBufLen
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
            (
                ModuleInfo[] memory mods_info,
                address[] memory owners
            ) = getModulesInfoByListers(ctxIds[i], listers, maxBufLen);
            modulesInfos[i] = mods_info;
            ctxIdsOwners[i] = owners;
        }
    }

    // +1.601 => 21.499
    function getModules(
        // offset when receiving data
        uint256 offset,
        // limit on receiving items
        uint256 limit
    )
        public
        view
        returns (
            ModuleInfo[] memory result,
            uint256 nextOffset,
            uint256 totalModules
        )
    {
        return LibDappletRegistryRead.getModules(s, offset, limit);
    }

    // Very naive impl.
    function getModulesInfoByListers(
        string memory ctxId,
        address[] memory listers,
        uint32 maxBufLen
    )
        public
        view
        returns (ModuleInfo[] memory modulesInfo, address[] memory owners)
    {
        uint256[] memory outbuf = new uint256[](
            maxBufLen > 0 ? maxBufLen : 1000
        );
        uint256 bufLen = _fetchModulesByUsersTag(ctxId, listers, outbuf, 0);
        modulesInfo = new ModuleInfo[](bufLen);
        owners = new address[](bufLen);
        for (uint256 i = 0; i < bufLen; ++i) {
            uint256 idx = outbuf[i];
            address owner = s._dappletNFTContract.ownerOf(idx);
            //ToDo: strip contentType indexes?
            modulesInfo[i] = s.modules[idx]; // WARNING! indexes are started from 1.
            owners[i] = owner;
        }
    }

    // +1.600 => 23.099
    function getModuleInfoByName(string memory mod_name)
        public
        view
        returns (ModuleInfo memory modulesInfo, address owner)
    {
        return LibDappletRegistryRead.getModuleInfoByName(s, mod_name);
    }

    // +1.818 => 24.917
    function getModulesInfoByOwner(
        address userId,
        // offset when receiving data
        uint256 offset,
        // limit on receiving items
        uint256 limit
    )
        public
        view
        returns (
            ModuleInfo[] memory modulesInfo,
            uint256 nextOffset,
            uint256 totalModules
        )
    {
        return
            LibDappletRegistryRead.getModulesInfoByOwner(
                s,
                userId,
                offset,
                limit
            );
    }

    // +0.242 => 25.159
    function getVersionNumbers(string memory name, string memory branch)
        public
        view
        returns (bytes memory)
    {
        bytes32 key = keccak256(abi.encodePacked(name, branch));
        return s.versionNumbers[key];
    }

    // +6.079 => 31.238
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

    // +0.102 => 31.340
    function getAllAdmins(string memory mod_name)
        public
        view
        returns (address[] memory)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        return s.adminsOfModules[mKey].values();
    }

    // +0.371 => 31.711
    function getContextIdsByModuleName(string memory mod_name)
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

    function changeMyList(LinkString[] memory links) public {
        LinkedList.Link[] memory linksOfModuleIdxs = new LinkedList.Link[](
            links.length
        );

        for (uint256 i = 0; i < links.length; ++i) {
            uint256 prev = getModuleIndx(links[i].prev);
            uint256 next = getModuleIndx(links[i].next);

            linksOfModuleIdxs[i] = LinkedList.Link(uint32(prev), uint32(next));
        }

        LinkedList.LinkedListUint32 storage listing = s.listingByLister[
            msg.sender
        ];

        bool isNewListing = listing.linkify(linksOfModuleIdxs);
        if (isNewListing) {
            s.listers.push(msg.sender);
        }
    }

    // function changeMyList(
    //     string[] memory dictionary,
    //     LinkedList.Link[] memory links
    // ) public {
    //     LinkedList.Link[] memory linksOfModuleIdxs = new LinkedList.Link[](
    //         links.length
    //     );

    //     for (uint256 i = 0; i < links.length; ++i) {
    //         // console.log(dictionary[links[i].prev]);
    //         // console.log(links[i].prev);
    //         console.log(links[i].next);

    //         uint256 prev = getModuleIndx(dictionary[links[i].prev]); // 0 => 0
    //         uint256 next = getModuleIndx(dictionary[links[i].next]); // 0 => 1
    //         console.log(prev, next);
    //         linksOfModuleIdxs[i] = LinkedList.Link(uint32(prev), uint32(next));
    //     }

    //     LinkedList.LinkedListUint32 storage listing = s.listingByLister[
    //         msg.sender
    //     ];

    //     bool isNewListing = listing.linkify(linksOfModuleIdxs);
    //     if (isNewListing) {
    //         s.listers.push(msg.sender);
    //     }
    // }

    // function changeMyList(string[2][] memory links) public {
    //     LinkedList.Link[] memory linksOfModuleIdxs = new LinkedList.Link[](
    //         links.length
    //     );

    //     for (uint256 i = 0; i < links.length; ++i) {
    //         uint256 prev = getModuleIndx(links[0][i]); // 0 => 0
    //         uint256 next = getModuleIndx(links[1][i]); // 0 => 1
    //         console.log(prev, next);
    //         linksOfModuleIdxs[i] = LinkedList.Link(uint32(prev), uint32(next));
    //     }

    //     LinkedList.LinkedListUint32 storage listing = s.listingByLister[
    //         msg.sender
    //     ];

    //     bool isNewListing = listing.linkify(linksOfModuleIdxs);
    //     if (isNewListing) {
    //         s.listers.push(msg.sender);
    //     }
    // }

    function addModuleInfo(
        string[] memory contextIds,
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
        uint32 mIdx = uint32(s.modules.length - 1); // WARNING! indexes are started from 1.
        s.moduleIdxs[mKey] = mIdx;

        // ContextId adding
        for (uint256 i = 0; i < contextIds.length; ++i) {
            bytes32 key = keccak256(abi.encodePacked(contextIds[i]));
            s.modsByContextType[key].add(mIdx);
            // s.contextIdsOfModules[mKey].push(contextIds[i]);
            s.contextIdsOfModules[mKey].add(contextIds[i]);
        }

        emit ModuleInfoAdded(contextIds, owner, mIdx);

        // Versions Adding
        for (uint256 i = 0; i < vInfos.length; ++i) {
            _addModuleVersionNoChecking(mIdx, mInfo.name, vInfos[i]);
        }

        // Creating Dapplet NFT
        s._dappletNFTContract.safeMint(owner, mIdx);
    }

    function editModuleInfo(
        string memory name,
        string memory title,
        string memory description,
        StorageRef memory fullDescription,
        StorageRef memory icon
    ) public {
        uint32 moduleIdx = _getModuleIdx(name);
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
        uint32 moduleIdx = _getModuleIdx(mod_name);
        require(
            s._dappletNFTContract.ownerOf(moduleIdx) == msg.sender ||
                s.adminsOfModules[mKey].contains(msg.sender) == true,
            "You are not the owner of this module"
        );

        _addModuleVersionNoChecking(moduleIdx, mod_name, vInfo);
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
        onlyOwnerModule(mod_name)
    {
        uint32 moduleIdx = _getModuleIdx(mod_name);

        bytes32 key = keccak256(abi.encodePacked(contextId));
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));

        // ContextId adding
        s.modsByContextType[key].add(moduleIdx);
        s.contextIdsOfModules[mKey].add(contextId);
    }

    function removeContextId(string memory mod_name, string memory contextId)
        public
        onlyOwnerModule(mod_name)
    {
        uint32 moduleIdx = _getModuleIdx(mod_name);

        // // ContextId adding
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        bytes32 key = keccak256(abi.encodePacked(contextId));

        s.modsByContextType[key].remove(moduleIdx);
        s.contextIdsOfModules[mKey].remove(contextId);
    }

    function addAdmin(string memory mod_name, address admin)
        public
        onlyOwnerModule(mod_name)
        returns (bool)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        return s.adminsOfModules[mKey].add(admin);
    }

    function removeAdmin(string memory mod_name, address admin)
        public
        onlyOwnerModule(mod_name)
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
                        s.listingByLister[listers[l]].contains(
                            uint32(modIdx)
                        ) == true
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
            v.extensionVersion
        );
        bytes32 vKey = keccak256(
            abi.encodePacked(mod_name, v.branch, v.major, v.minor, v.patch)
        );
        s.versions[vKey] = vInfo;

        bytes32 nbKey = keccak256(abi.encodePacked(mod_name, vInfo.branch));
        s.versionNumbers[nbKey].push(bytes1(vInfo.major));
        s.versionNumbers[nbKey].push(bytes1(vInfo.minor));
        s.versionNumbers[nbKey].push(bytes1(vInfo.patch));
        s.versionNumbers[nbKey].push(bytes1(0x0));

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
        returns (uint32)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        uint32 moduleIdx = s.moduleIdxs[mKey];
        require(moduleIdx != 0, "The module does not exist");
        return moduleIdx;
    }
}
