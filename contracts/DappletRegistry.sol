// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

// Import EnumerableSet from the OpenZeppelin Contracts library
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./DappletNFT.sol";

contract DappletRegistry {
    using EnumerableSet for EnumerableSet.AddressSet;

    event ModuleInfoAdded(
        string[] contextIds,
        address owner,
        uint32 moduleIndex
    );

    struct StorageRef {
        bytes32 hash;
        bytes[] uris; //use 2 leading bytes as prefix
    }

    // ToDo: introduce mapping for alternative sources,
    struct ModuleInfo {
        uint8 moduleType;
        string name;
        string title;
        string description;
        StorageRef icon;
        string[] interfaces; //Exported interfaces in all versions. no duplicates.
        uint256 flags; // 255 bit - IsUnderConstruction
    }

    struct VersionInfo {
        uint256 modIdx;
        string branch;
        uint8 major;
        uint8 minor;
        uint8 patch;
        StorageRef binary;
        bytes32[] dependencies; // key of module
        bytes32[] interfaces; //Exported interfaces. no duplicates.
        uint8 flags;
    }

    struct VersionInfoDto {
        string branch;
        uint8 major;
        uint8 minor;
        uint8 patch;
        StorageRef binary;
        DependencyDto[] dependencies; // key of module
        DependencyDto[] interfaces; //Exported interfaces. no duplicates.
        uint8 flags;
    }

    struct DependencyDto {
        string name;
        string branch;
        uint8 major;
        uint8 minor;
        uint8 patch;
    }

    mapping(bytes32 => bytes) public versionNumbers; // keccak(name,branch) => <bytes4[]> versionNumbers
    mapping(bytes32 => VersionInfo) public versions; // keccak(name,branch,major,minor,patch) => VersionInfo>
    mapping(bytes32 => uint32[]) public modsByContextType; // key - keccak256(contextId, owner), value - index of element in "modules" array
    mapping(bytes32 => uint32) public moduleIdxs;
    ModuleInfo[] public modules;

    mapping(bytes32 => EnumerableSet.AddressSet) private adminsOfModules; // key - mod_name => EnumerableSet address for added, removed and get all address

    DappletNFT _dappletNFTContract;

    constructor(address _dappletNFTContractAddress) {
        modules.push(); // Zero index is reserved
        _dappletNFTContract = DappletNFT(_dappletNFTContractAddress);
    }

    // -------------------------------------------------------------------------
    // Modificators
    // -------------------------------------------------------------------------

    modifier onlyOwnerModule(string memory name) {
        uint256 moduleIdx = _getModuleIdx(name);
        require(_dappletNFTContract.ownerOf(moduleIdx) == msg.sender, "You are not the owner of this module");
        _;
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    function getNFTContractAddress() public view returns (address) {
        return address(_dappletNFTContract);
    }

    function getModuleIndx(string memory mod_name) public view returns (uint32 moduleIdx) {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        moduleIdx = moduleIdxs[mKey];
    }

    function getModuleInfoBatch(
        string[] memory ctxIds,
        address[] memory users,
        uint32 maxBufLen
    ) public view returns (ModuleInfo[][] memory modulesInfos, address[][] memory ctxIdsOwners) {
        modulesInfos = new ModuleInfo[][](ctxIds.length);
        ctxIdsOwners = new address[][](ctxIds.length);
        for (uint256 i = 0; i < ctxIds.length; ++i) {
            (ModuleInfo[] memory mods_info, address[] memory owners) = getModuleInfo(ctxIds[i], users, maxBufLen);
            modulesInfos[i] = mods_info;
            ctxIdsOwners[i] = owners;
        }
    }

    // Very naive impl.
    function getModuleInfo(
        string memory ctxId,
        address[] memory users,
        uint32 maxBufLen
    ) public view returns (ModuleInfo[] memory modulesInfo, address[] memory owners) {
        uint256[] memory outbuf = new uint256[](
            maxBufLen > 0 ? maxBufLen : 1000
        );
        uint256 bufLen = _fetchModulesByUsersTag(ctxId, users, outbuf, 0);
        modulesInfo = new ModuleInfo[](bufLen);
        owners = new address[](bufLen);
        for (uint256 i = 0; i < bufLen; ++i) {
            uint256 idx = outbuf[i];
            address owner = _dappletNFTContract.ownerOf(idx);
            modulesInfo[i] = modules[idx]; // WARNING! indexes are started from 1.
            owners[i] = owner;
            //ToDo: strip contentType indexes?
        }
    }

    function getModuleInfoByName(string memory mod_name)
        public
        view
        returns (ModuleInfo memory modulesInfo, address owner)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        require(moduleIdxs[mKey] != 0, "The module does not exist");
        modulesInfo = modules[moduleIdxs[mKey]];
        owner = _dappletNFTContract.ownerOf(moduleIdxs[mKey]);
    }

    function getModuleInfoByOwner(
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
        (
            uint256[] memory dappIndxs,
            uint256 nextOffsetFromNFT,
            uint256 totalModulesFromNFT
        ) = _dappletNFTContract.getModulesIndexes(userId, offset, limit);

        nextOffset = nextOffsetFromNFT;
        totalModules = totalModulesFromNFT;
        modulesInfo = new ModuleInfo[](dappIndxs.length);
        for (uint256 i = 0; i < dappIndxs.length; ++i) {
            modulesInfo[i] = modules[dappIndxs[i]];
        }
    }

    function getVersionNumbers(string memory name, string memory branch)
        public
        view
        returns (bytes memory)
    {
        bytes32 key = keccak256(abi.encodePacked(name, branch));
        return versionNumbers[key];
    }

    function getVersionInfo(
        string memory name,
        string memory branch,
        uint8 major,
        uint8 minor,
        uint8 patch
    ) public view returns (VersionInfoDto memory dto, uint8 moduleType) {
        bytes32 key = keccak256(
            abi.encodePacked(name, branch, major, minor, patch)
        );
        VersionInfo memory v = versions[key];
        require(v.modIdx != 0, "Version doesn't exist");

        DependencyDto[] memory deps = new DependencyDto[](
            v.dependencies.length
        );
        for (uint256 i = 0; i < v.dependencies.length; ++i) {
            VersionInfo memory depVi = versions[v.dependencies[i]];
            ModuleInfo memory depMod = modules[depVi.modIdx];
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
            VersionInfo memory intVi = versions[v.interfaces[i]];
            ModuleInfo memory intMod = modules[intVi.modIdx];
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
            v.flags
        );
        moduleType = modules[v.modIdx].moduleType;
    }

    function getAllAdmins(string memory mod_name)
        public
        view
        returns (address[] memory)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        return adminsOfModules[mKey].values();
    }

    // -------------------------------------------------------------------------
    // State modifying functions
    // -------------------------------------------------------------------------

    function addModuleInfo(
        string[] memory contextIds,
        ModuleInfo memory mInfo,
        VersionInfoDto[] memory vInfos
    ) public {
        bytes32 mKey = keccak256(abi.encodePacked(mInfo.name));
        require(moduleIdxs[mKey] == 0, "The module already exists"); // module does not exist

        address owner = msg.sender;

        // ModuleInfo adding
        mInfo.flags = (vInfos.length == 0) // is under construction (no any version)
            ? (mInfo.flags | (uint256(1) << 0)) // flags[255] == 1
            : (mInfo.flags & ~(uint256(1) << 0)); // flags[255] == 0
        modules.push(mInfo);
        uint32 mIdx = uint32(modules.length - 1); // WARNING! indexes are started from 1.
        moduleIdxs[mKey] = mIdx;

        // ContextId adding
        for (uint256 i = 0; i < contextIds.length; ++i) {
            bytes32 key = keccak256(abi.encodePacked(contextIds[i], owner));
            modsByContextType[key].push(mIdx);
        }

        emit ModuleInfoAdded(contextIds, owner, mIdx);

        // Versions Adding
        for (uint256 i = 0; i < vInfos.length; ++i) {
            _addModuleVersionNoChecking(mIdx, mInfo.name, vInfos[i]);
        }

        // Creating Dapplet NFT
        _dappletNFTContract.safeMint(owner, mIdx);
    }

    function editModuleInfo(
        string memory name,
        string memory title,
        string memory description,
        StorageRef memory icon
    ) public {
        uint32 moduleIdx = _getModuleIdx(name);
        ModuleInfo storage m = modules[moduleIdx]; // WARNING! indexes are started from 1.
        require(_dappletNFTContract.ownerOf(moduleIdx) == msg.sender, "You are not the owner of this module");

        m.title = title;
        m.description = description;
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
            _dappletNFTContract.ownerOf(moduleIdx) == msg.sender ||
                adminsOfModules[mKey].contains(msg.sender) == true,
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
    {
        uint32 moduleIdx = _getModuleIdx(mod_name);

        // ContextId adding
        address userId = msg.sender;
        bytes32 key = keccak256(abi.encodePacked(contextId, userId));
        modsByContextType[key].push(moduleIdx);
    }

    function removeContextId(string memory mod_name, string memory contextId)
        public
    {
        uint32 moduleIdx = _getModuleIdx(mod_name);

        // // ContextId adding
        address userId = msg.sender;
        bytes32 key = keccak256(abi.encodePacked(contextId, userId));

        uint32[] storage _modules = modsByContextType[key];

        // modules.length => _modules.length
        for (uint256 i = 0; i < _modules.length; ++i) {
            if (_modules[i] == moduleIdx) {
                _modules[i] = _modules[_modules.length - 1];
                _modules.pop();
                break;
            }
        }
    }

    function addAdmin(string memory mod_name, address admin)
        public
        onlyOwnerModule(mod_name)
        returns (bool)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        return adminsOfModules[mKey].add(admin);
    }

    function removeAdmin(string memory mod_name, address admin)
        public
        onlyOwnerModule(mod_name)
        returns (bool)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        return adminsOfModules[mKey].remove(admin);
    }

    // -------------------------------------------------------------------------
    // Internal functions
    // -------------------------------------------------------------------------

    function _fetchModulesByUsersTags(
        string[] memory interfaces,
        address[] memory users,
        uint256[] memory outbuf,
        uint256 _bufLen
    ) internal view returns (uint256) {
        uint256 bufLen = _bufLen;

        for (uint256 i = 0; i < interfaces.length; ++i) {
            bufLen = _fetchModulesByUsersTag(
                interfaces[i],
                users,
                outbuf,
                bufLen
            );
        }

        return bufLen;
    }

    // ctxId - URL or ContextType [IdentityAdapter]
    function _fetchModulesByUsersTag(
        string memory ctxId,
        address[] memory users,
        uint256[] memory outbuf,
        uint256 _bufLen
    ) internal view returns (uint256) {
        uint256 bufLen = _bufLen;
        for (uint256 i = 0; i < users.length; ++i) {
            bytes32 key = keccak256(abi.encodePacked(ctxId, users[i]));
            uint32[] memory modIdxs = modsByContextType[key];
            //add if no duplicates in buffer[0..nn-1]
            uint256 lastBufLen = bufLen;
            for (uint256 j = 0; j < modIdxs.length; ++j) {
                uint256 modIdx = modIdxs[j];
                uint256 k = 0;
                for (; k < lastBufLen; ++k) {
                    if (outbuf[k] == modIdx) break; //duplicate found
                }
                if (k == lastBufLen) {
                    //no duplicates found  -- add the module's index
                    outbuf[bufLen++] = modIdx;
                    ModuleInfo memory m = modules[modIdx];
                    bufLen = _fetchModulesByUsersTag(
                        m.name,
                        users,
                        outbuf,
                        bufLen
                    ); // using index as a tag.
                    bufLen = _fetchModulesByUsersTags(
                        m.interfaces,
                        users,
                        outbuf,
                        bufLen
                    );
                    //ToDo: what if owner changes? CREATE MODULE ENS  NAMES! on creating ENS
                }
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
            require(versions[dKey].modIdx != 0, "Dependency doesn't exist");
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
            require(versions[iKey].modIdx != 0, "Interface doesn't exist");
            interfaces[i] = iKey;

            // add interface name to ModuleInfo if not exist
            bool isInterfaceExist = false;
            for (uint256 j = 0; j < modules[moduleIdx].interfaces.length; ++j) {
                if (
                    keccak256(
                        abi.encodePacked(modules[moduleIdx].interfaces[j])
                    ) == keccak256(abi.encodePacked(interf.name))
                ) {
                    isInterfaceExist = true;
                    break;
                }
            }

            if (isInterfaceExist == false) {
                modules[moduleIdx].interfaces.push(interf.name);
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
            v.flags
        );
        bytes32 vKey = keccak256(
            abi.encodePacked(mod_name, v.branch, v.major, v.minor, v.patch)
        );
        versions[vKey] = vInfo;

        bytes32 nbKey = keccak256(abi.encodePacked(mod_name, vInfo.branch));
        versionNumbers[nbKey].push(bytes1(vInfo.major));
        versionNumbers[nbKey].push(bytes1(vInfo.minor));
        versionNumbers[nbKey].push(bytes1(vInfo.patch));
        versionNumbers[nbKey].push(bytes1(0x0));

        // reset IsUnderConstruction flag
        if (((modules[moduleIdx].flags >> 0) & uint256(1)) == 1) {
            modules[moduleIdx].flags =
                modules[moduleIdx].flags &
                ~(uint256(1) << 0);
        }
    }

    function _getModuleIdx(string memory mod_name)
        internal
        view
        returns (uint32)
    {
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        uint32 moduleIdx = moduleIdxs[mKey];
        require(moduleIdx != 0, "The module does not exist");
        return moduleIdx;
    }
}
