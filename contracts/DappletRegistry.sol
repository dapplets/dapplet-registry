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
import {ReservationStake} from "./ReservationStake.sol";

struct LinkString {
    string prev;
    string next;
}

contract DappletRegistry is ReservationStake {
    using LinkedList for LinkedList.LinkedListUint32;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableStringSet for EnumerableStringSet.StringSet;

    bytes32 internal constant _HEAD =
        0x321c2cb0b0673952956a3bfa56cf1ce4df0cd3371ad51a2c5524561250b01836; // keccak256(abi.encodePacked("H"))
    bytes32 internal constant _TAIL =
        0x846b7b6deb1cfa110d0ea7ec6162a7123b761785528db70cceed5143183b11fc; // keccak256(abi.encodePacked("T"))

    AppStorage internal s;

    constructor(address _dappletNFTContractAddress) {
        s.modules.push(); // Zero index is reserved
        s._dappletNFTContract = DappletNFT(_dappletNFTContractAddress);
    }

    // -------------------------------------------------------------------------
    // Modifiers
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

    function getModulesOfListing(
        address lister,
        string memory branch,
        uint256 offset,
        uint256 limit,
        bool reverse
    )
        public
        view
        returns (
            ModuleInfo[] memory modules,
            VersionInfoDto[] memory lastVersions,
            address[] memory owners,
            uint256 total
        )
    {
        return
            LibDappletRegistryRead.getModulesOfListing(
                s,
                lister,
                branch,
                offset,
                limit,
                reverse
            );
    }

    function getListers(uint256 offset, uint256 limit)
        public
        view
        returns (address[] memory listers, uint256 total)
    {
        return LibDappletRegistryRead.getListers(s, offset, limit);
    }

    function getListersByModule(
        string memory moduleName,
        uint256 offset,
        uint256 limit
    ) public view returns (address[] memory out) {
        return
            LibDappletRegistryRead.getListersByModule(
                s,
                moduleName,
                offset,
                limit
            );
    }

    function containsModuleInListing(address lister, string memory moduleName)
        public
        view
        returns (bool)
    {
        uint256 moduleIdx = _getModuleIdx(moduleName);
        return s.listingByLister[lister].contains(moduleIdx);
    }

    function getNftContractAddress() public view returns (address) {
        return address(s._dappletNFTContract);
    }

    function getModuleIndex(string memory moduleName)
        public
        view
        returns (uint256 moduleIdx)
    {
        moduleIdx = _getModuleIdx(moduleName);
    }

    function getModulesInfoByListersBatch(
        string[] memory ctxIds,
        address[] memory listers,
        uint256 maxBufLen
    )
        public
        view
        returns (ModuleInfo[][] memory modules, address[][] memory owners)
    {
        return
            LibDappletRegistryRead.getModulesInfoByListersBatch(
                s,
                ctxIds,
                listers,
                maxBufLen
            );
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
        uint256 limit,
        bool reverse
    )
        public
        view
        returns (
            ModuleInfo[] memory modules,
            VersionInfoDto[] memory lastVersions,
            address[] memory owners,
            uint256 total
        )
    {
        return
            LibDappletRegistryRead.getModules(
                s,
                branch,
                offset,
                limit,
                reverse
            );
    }

    function getModuleInfoByName(string memory moduleName)
        public
        view
        returns (ModuleInfo memory modules, address owner) // ToDo: rename modules to module
    {
        return LibDappletRegistryRead.getModuleInfoByName(s, moduleName);
    }

    function getModulesByOwner(
        address owner,
        string memory branch,
        uint256 offset,
        uint256 limit,
        bool reverse
    )
        public
        view
        returns (
            ModuleInfo[] memory modules,
            VersionInfoDto[] memory lastVersions,
            uint256 total
        )
    {
        return
            LibDappletRegistryRead.getModulesByOwner(
                s,
                owner,
                branch,
                offset,
                limit,
                reverse
            );
    }

    function getBranchesByModule(string memory name)
        public
        view
        returns (string[] memory)
    {
        return s.branches[_getModuleIdx(name)];
    }

    function getVersionsByModule(
        string memory name,
        string memory branch,
        uint256 offset,
        uint256 limit,
        bool reverse
    ) public view returns (VersionInfoDto[] memory versions, uint256 total) {
        return
            LibDappletRegistryRead.getVersionsByModule(
                s,
                name,
                branch,
                offset,
                limit,
                reverse
            );
    }

    function getVersionInfo(
        string memory name,
        string memory branch,
        bytes4 version
    ) public view returns (VersionInfoDto memory dto, uint8 moduleType) {
        return LibDappletRegistryRead.getVersionInfo(s, name, branch, version);
    }

    function getAdminsByModule(string memory moduleName)
        public
        view
        returns (address[] memory)
    {
        return s.adminsOfModules[_getModuleIdx(moduleName)].values();
    }

    function getContextIdsByModule(string memory moduleName)
        public
        view
        returns (string[] memory)
    {
        return s.contextIdsOfModules[_getModuleIdx(moduleName)].values();
    }
    
    // ToDo: add function to find implementations by specific interface name

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

    // ToDo: separate function for moduleinfo with version

    function addModuleInfo(
        string[] memory contextIds,
        LinkString[] memory links,
        ModuleInfo memory mInfo,
        VersionInfoDto memory vInfo,
        uint256 reservationPeriod
    ) public {
        bytes32 mKey = keccak256(abi.encodePacked(mInfo.name));

        require(s.modules.length < 0xFFFFFFFF, "Max modules reached");
        require(bytes(mInfo.title).length > 0, "Module title is required");
        require(mInfo.moduleType != 0, "Module type is required");
        require(s.moduleIdxs[mKey] == 0, "The module already exists");

        address owner = msg.sender;

        bool isUnderConstruction = vInfo.version == bytes3(0x0);

        mInfo.flags = (isUnderConstruction) // is under construction (no any version)
            ? (mInfo.flags | (uint256(1) << 0)) // flags[255] == 1
            : (mInfo.flags & ~(uint256(1) << 0)); // flags[255] == 0

        // ModuleInfo adding
        s.modules.push(mInfo);
        uint256 mIdx = s.modules.length - 1; // WARNING! indexes are started from 1.
        s.moduleIdxs[mKey] = mIdx;

        // ContextId adding
        for (uint256 i = 0; i < contextIds.length; ++i) {
            bytes32 key = keccak256(abi.encodePacked(contextIds[i]));
            s.modsByContextType[key].add(mIdx);
            s.contextIdsOfModules[mIdx].add(contextIds[i]);
        }

        // Versions Adding
        if (!isUnderConstruction) {
            _addModuleVersionNoChecking(mIdx, vInfo);
        }
        
        // Require stake for DUC
        if (isUnderConstruction && _isStakingActive()) {
            extendReservation(mInfo.name, reservationPeriod);
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
        StorageRef memory image,
        StorageRef memory manifest,
        StorageRef memory icon
    ) public {
        uint256 moduleIdx = _getModuleIdx(name);
        ModuleInfo storage m = s.modules[moduleIdx]; // WARNING! indexes are started from 1.
        require(
            s._dappletNFTContract.ownerOf(moduleIdx) == msg.sender,
            "You are not the owner of this module"
        );
        // ToDo: allow edit module for admin

        m.title = title;
        m.description = description;
        m.image = image;
        m.manifest = manifest;
        m.icon = icon;
    }

    function addModuleVersion(
        string memory moduleName,
        VersionInfoDto memory vInfo
    ) public {
        // ******** TODO: check existing versions and version sorting
        uint256 moduleIdx = _getModuleIdx(moduleName);
        require(
            s._dappletNFTContract.ownerOf(moduleIdx) == msg.sender ||
                s.adminsOfModules[moduleIdx].contains(msg.sender) == true,
            "You are not the owner of this module"
        );
        
        // Return stake if a regular dapplet is deploying
        if (_isStakingActive() && getStakeStatus(moduleName) != _NO_STAKE) {
            require(getStakeStatus(moduleName) == _WAITING_FOR_REGULAR_DAPPLET, "Reservation period is expired");
            _withdrawStake(moduleName, msg.sender);
        }

        _addModuleVersionNoChecking(moduleIdx, vInfo);
    }

    function addContextId(string memory moduleName, string memory contextId)
        public
        onlyModuleOwner(moduleName)
    {
        uint256 moduleIdx = _getModuleIdx(moduleName);

        bytes32 key = keccak256(abi.encodePacked(contextId));

        // ContextId adding
        s.modsByContextType[key].add(moduleIdx);
        s.contextIdsOfModules[moduleIdx].add(contextId);
    }

    function removeContextId(string memory moduleName, string memory contextId)
        public
        onlyModuleOwner(moduleName)
    {
        uint256 moduleIdx = _getModuleIdx(moduleName);

        bytes32 key = keccak256(abi.encodePacked(contextId));

        // ContextId removing
        s.modsByContextType[key].remove(moduleIdx);
        s.contextIdsOfModules[moduleIdx].remove(contextId);
    }

    function addAdmin(string memory moduleName, address admin)
        public
        onlyModuleOwner(moduleName)
        returns (bool)
    {
        uint256 moduleIdx = _getModuleIdx(moduleName);
        return s.adminsOfModules[moduleIdx].add(admin);
    }

    function removeAdmin(string memory moduleName, address admin)
        public
        onlyModuleOwner(moduleName)
        returns (bool)
    {
        uint256 moduleIdx = _getModuleIdx(moduleName);
        return s.adminsOfModules[moduleIdx].remove(admin);
    }

    function burnDUC(string memory moduleName) public {
        require(getStakeStatus(moduleName) == _READY_TO_BURN, "DUC is not ready to burn");
        _burnStake(moduleName, msg.sender);

        // ToDo: clean modsByContextType?

        bytes32 mKey = keccak256(abi.encodePacked(moduleName));
        uint256 mIdx = s.moduleIdxs[mKey];

        delete s.moduleIdxs[mKey];
        delete s.modules[mIdx]; // ToDo: what happens with NFT?

        s.burnedByModule[mIdx] = true;
    }

    // -------------------------------------------------------------------------
    // Internal functions
    // -------------------------------------------------------------------------

    function _addModuleVersionNoChecking(
        uint256 moduleIdx,
        VersionInfoDto memory v
    ) private {
        bytes32 vKey = keccak256(
            abi.encodePacked(moduleIdx, v.branch, v.version)
        );
        require(s.versions[vKey].modIdx == 0, "Version already exists");

        bytes32 nbKey = keccak256(abi.encodePacked(moduleIdx, v.branch));
        bytes4[] storage versionNumbers = s.versionNumbers[nbKey];

        // check correct versioning
        if (versionNumbers.length > 0) {
            bytes4 lastVersion = versionNumbers[versionNumbers.length - 1];
            require(v.version > lastVersion, "Version must be bumped");
        }

        bytes32[] memory deps = new bytes32[](v.dependencies.length);
        for (uint256 i = 0; i < v.dependencies.length; ++i) {
            DependencyDto memory d = v.dependencies[i];
            uint256 dIdx = _getModuleIdx(d.name);
            bytes32 dKey = keccak256(
                abi.encodePacked(dIdx, d.branch, d.version)
            );
            require(s.versions[dKey].modIdx != 0, "Dependency doesn't exist");
            deps[i] = dKey;
        }

        bytes32[] memory interfaces = new bytes32[](v.interfaces.length);
        for (uint256 i = 0; i < v.interfaces.length; ++i) {
            DependencyDto memory interf = v.interfaces[i];
            uint256 interfIdx = _getModuleIdx(interf.name);
            bytes32 iKey = keccak256(
                abi.encodePacked(interfIdx, interf.branch, interf.version)
            );
            require(s.versions[iKey].modIdx != 0, "Interface doesn't exist");
            interfaces[i] = iKey;

            // ToDo: replace with Set?
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
            v.version,
            v.binary,
            deps,
            interfaces,
            v.flags,
            v.extensionVersion,
            block.timestamp
        );
        s.versions[vKey] = vInfo;

        // add branch if not exists
        if (versionNumbers.length == 0) {
            s.branches[moduleIdx].push(v.branch);
        }

        // add version number
        versionNumbers.push(vInfo.version);

        // reset IsUnderConstruction flag
        if (((s.modules[moduleIdx].flags >> 0) & uint256(1)) == 1) {
            s.modules[moduleIdx].flags =
                s.modules[moduleIdx].flags &
                ~(uint256(1) << 0);
        }
    }

    function _getModuleIdx(string memory moduleName)
        internal
        view
        returns (uint256)
    {
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

    function _isDUC(uint256 moduleIdx) internal view returns (bool) {
        return (s.modules[moduleIdx].flags >> 0) & uint256(1) == 1;
    }
}
