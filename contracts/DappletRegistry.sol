// SPDX-License-Identifier: MIT
pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;
contract DappletRegistry {

    // struct TypedURI {
    //   bytes2 typ;
    //     bytes uri;
    // }

    event ModuleInfoAdded (
        string[] contextIds,
        bytes32 owner,
        uint32 moduleIndex
    );
    
    struct StorageRef {
        bytes32 hash;
        bytes[] uris; //use 2 leading bytes as prefix
    }

    // ToDo: introduce mapping for alternative sources,
    struct ModuleInfo {
       string name;
       uint8 moduleType;
       string title;
       string description;
       bytes32 owner;
       VersionInfo[] versions;
       string[] interfaces; //Exported interfaces in all versions. no duplicates.
       StorageRef icon;
       uint flags;
    }

    // Q&A: Are Interfaces - Modules? 

    struct Dependency {
        string name;
        uint32 major;
        uint32 minor;
        uint32 patch;
    }

    struct VersionInfo {
       string branch;
       uint32 major;
       uint32 minor;
       uint32 patch;
       uint96 flags;
       StorageRef binary;
       Dependency[] dependencies; // key of module 
       bytes32[] interfaces; //Exported interfaces. no duplicates.
    }
    
    struct Version {
       uint32 major;
       uint32 minor;
       uint32 patch;
    }

    mapping(bytes32 => uint) moduleIdxs;
    ModuleInfo[] modules;
    VersionInfo[] versions;

    mapping(bytes32 => uint32[]) modsByContextType; // key - keccak256(contextId, owner), value - index of element in "modules" array
    mapping(bytes32 => uint32) modsByName;
    mapping(bytes32 => uint) userTags;

    string[] contentTypes;   //upto 65535 types;
    mapping(string => uint16) contentTypeMap;  //reverse type->index mapping
    
    mapping(bytes32 => uint[]) versionIdxByBranch; // key - keccak256(name,branch), value - array of indexes of element in "modules[i].versions" array

    //Very naive impl.
    function getModuleInfo(string memory ctxId, bytes32[] memory users, uint32 maxBufLen) public view returns (ModuleInfo[] memory mod_info) {
        uint[] memory outbuf = new uint[]( maxBufLen > 0 ? maxBufLen : 1000 );
        uint bufLen = _fetchModulesByUsersTag(ctxId, users, outbuf, 0);
        mod_info = new ModuleInfo[](bufLen);
        for(uint i = 0; i < bufLen; ++i) {
            uint idx = outbuf[i];
            mod_info[i] = modules[idx]; // WARNING! indexes are started from 1.
            //ToDo: strip contentType indexes?
        }
    }
    
    function _fetchModulesByUsersTags(string[] memory interfaces, bytes32[] memory users, uint[] memory outbuf, uint _bufLen) internal view returns (uint) {
        uint bufLen = _bufLen;
        
        for (uint i = 0; i < interfaces.length; ++i) {
            bufLen = _fetchModulesByUsersTag(interfaces[i], users, outbuf, bufLen);
        }
        
        return bufLen;
    }

    // ctxId - URL or ContextType [IdentityAdapter]
    function _fetchModulesByUsersTag(string memory ctxId, bytes32[] memory users, uint[] memory outbuf, uint _bufLen) internal view returns (uint) {
        uint bufLen = _bufLen;
        for (uint i = 0; i < users.length; ++i) {
            bytes32 key = keccak256(abi.encodePacked(ctxId, users[i]));
            uint32[] memory modIdxs = modsByContextType[key];
            //add if no duplicates in buffer[0..nn-1]
            uint lastBufLen = bufLen;
            for(uint j = 0; j < modIdxs.length; ++j) {
                uint modIdx = modIdxs[j];
                uint k = 0;
                for(; k < lastBufLen; ++k) {
                    if (outbuf[k] == modIdx) break; //duplicate found
                }
                if (k == lastBufLen) { //no duplicates found  -- add the module's index
                    outbuf[bufLen++] = modIdx;
                    ModuleInfo memory m = modules[modIdx];
                    bufLen = _fetchModulesByUsersTag(m.name, users, outbuf, bufLen); // using index as a tag.
                    bufLen = _fetchModulesByUsersTags(m.interfaces, users, outbuf, bufLen);
                    //ToDo: what if owner changes? CREATE MODULE ENS  NAMES! on creating ENS  
                }
            }
        }
        return bufLen;
    }
    
    
    // function getModuleInfo(uint32[] memory indexes) public view returns (ModuleInfo[] memory infos) {
    //     infos = new ModuleInfo[](indexes.length);
    //     for(uint i = 0; i<infos.length; ++i) {
    //         infos[i] = modules[indexes[i]];
    //     }
    // }
    
    function addModuleInfo(string[] memory contextIds, ModuleInfo memory mInfo, bytes32 userId) public {
        require(_isEnsOwner(userId));
        bytes32 mKey = keccak256(abi.encodePacked(mInfo.name));
        require(moduleIdxs[mKey] == 0, 'The module already exists'); // module does not exist
        bytes32 owner = userId == 0 ? bytes32(uint(msg.sender)) : userId;
        
        // ModuleInfo adding
        modules.push();
        ModuleInfo storage m = modules[modules.length - 1];
        
        // Copy every property because of error "Copying of type struct to storage not yet supported."
        m.moduleType = mInfo.moduleType;
        m.name = mInfo.name;
        m.title = mInfo.title;
        m.description = mInfo.description;
        m.owner = owner;
        for (uint i = 0; i < mInfo.versions.length; ++i) {
            m.versions.push(); // VersionInfo adding  
            VersionInfo storage vi = m.versions[m.versions.length - 1];
            vi.branch = mInfo.versions[i].branch;
            vi.major = mInfo.versions[i].major;
            vi.minor = mInfo.versions[i].minor;
            vi.patch = mInfo.versions[i].patch;
            vi.flags = mInfo.versions[i].flags;
            vi.binary = mInfo.versions[i].binary;
            //vi.dependencies = mInfo.versions[i].dependencies;
            vi.interfaces = mInfo.versions[i].interfaces;
        }
        m.interfaces = mInfo.interfaces;
        m.icon = mInfo.icon;
        m.flags = mInfo.flags;
        
        uint32 mIdx = uint32(modules.length - 1); // WARNING! indexes are started from 1.
        moduleIdxs[mKey] = mIdx;
        
        // ContextId adding
        for (uint i = 0; i < contextIds.length; ++i) {
            bytes32 key = keccak256(abi.encodePacked(contextIds[i], owner));
            modsByContextType[key].push(mIdx);
        }
        
        emit ModuleInfoAdded(contextIds, owner, mIdx);
    }
    
    function addModuleVersion(string memory mod_name, VersionInfo memory vInfo, bytes32 userId) public {
        require(_isEnsOwner(userId));
        // ******** TODO: check existing versions and version sorting
        bytes32 owner = userId == 0 ? bytes32(uint(msg.sender)) : userId;
        bytes32 mKey = keccak256(abi.encodePacked(mod_name));
        uint moduleIdx = moduleIdxs[mKey];
        require(moduleIdx != 0, 'The module does not exist');
        ModuleInfo storage m = modules[moduleIdx]; // WARNING! indexes are started from 1.
        require(m.owner == owner, 'You are not the owner of this module');
        
        m.versions.push(vInfo);
        
        // Add version index for fast filtering by branches
        versionIdxByBranch[keccak256(abi.encodePacked(mod_name, vInfo.branch))].push(m.versions.length - 1);
    }
    
    function _isEnsOwner(bytes32 userId) private pure returns(bool) {
        return userId >= 0; //ToDo: NOT_IMPLEMENTED
    }
    
    function getModules(string memory ctxId, bytes32[] memory users, uint32 maxBufLen) public view returns (string[] memory) {
        ModuleInfo[] memory mi = getModuleInfo(ctxId, users, maxBufLen);
        string[] memory names = new string[](mi.length);
        
        for (uint i = 0; i < mi.length; ++i) {
            names[i] = mi[i].name;
        }
        
        return names;
    }
    
    function getVersions(string memory name, string memory branch) public view returns (Version[] memory) { 
        bytes32 mKey = keccak256(abi.encodePacked(name));
        require(moduleIdxs[mKey] != 0, 'The module does not exist');
        ModuleInfo memory m = modules[moduleIdxs[mKey]]; // WARNING! indexes are started from 1.
        uint[] memory indexes = versionIdxByBranch[keccak256(abi.encodePacked(name, branch))];
        Version[] memory versions = new Version[](indexes.length);
        for (uint i = 0; i < indexes.length; ++i) {
            VersionInfo memory vi = m.versions[indexes[i]];
            versions[i] = Version(vi.major, vi.minor, vi.patch);
        }
        return versions;
    }

    struct ResolveToManifestOutput {
       string name;
       string branch;
       uint32 major;
       uint32 minor;
       uint32 patch;
       uint8 moduleType;
       string title;
       string description;
       bytes32 owner;
       StorageRef icon;
       StorageRef binary;
       Dependency[] dependencies;
    }

    function resolveToManifest(string memory name, string memory branch, Version memory version) public view returns (ResolveToManifestOutput memory) { 
        bytes32 mKey = keccak256(abi.encodePacked(name));
        require(moduleIdxs[mKey] != 0, 'The module does not exist');
        ModuleInfo memory m = modules[moduleIdxs[mKey]]; // WARNING! indexes are started from 1.
        uint[] memory indexes = versionIdxByBranch[keccak256(abi.encodePacked(name, branch))];
        bytes32 vHash = keccak256(abi.encodePacked(version.major, version.minor, version.patch));
        
        // ToDo: get rid of loop
        for (uint i = indexes.length - 1; i >= 0; --i) {
            VersionInfo memory vi = m.versions[indexes[i]];
            if (vHash == keccak256(abi.encodePacked(vi.major, vi.minor, vi.patch))) {
                ResolveToManifestOutput memory output;
                output.name = m.name;
                output.branch = vi.branch;
                output.major = vi.major;
                output.minor = vi.minor;
                output.patch = vi.patch;
                output.moduleType = m.moduleType;
                output.title = m.title;
                output.description = m.description;
                output.owner = m.owner;
                output.icon = m.icon;
                output.binary = vi.binary;
                output.dependencies = new Dependency[](vi.dependencies.length);
                for (uint j = 0; j < vi.dependencies.length; ++j) {
                    output.dependencies[j] = vi.dependencies[j];
                }
                return output;
            }
        }
    }
    
    // function addContextId(string memory contextId, string memory moduleName) public {
        
    // }
    
    // function addLocation(string memory moduleName, bytes32 contextId) public { 
    //     bytes32 mKey = keccak256(abi.encodePacked(moduleName));
    //     uint mIdx = moduleIdxs[mKey];
    //     require(mIdx != 0, 'The module does not exist');
    //     bytes32 key = keccak256(abi.encodePacked(contextId, bytes32(uint(msg.sender))));
    //     modsByContextType[key].push(mIdx);
    // }
    
    // function setVersionTags(uint tags, bytes32 vKey, bytes32 userId) public {
    //     require(versionInfo[vKey].moduleIdx > 0);
    //     bytes32 key = keccak256(abi.encodePacked(vKey,userId));
    //     userTags[key] |= tags;
    // }
    
    // function clearVersionTags(uint tags, bytes32 vKey, bytes32 userId) public {
    //     require(versionInfo[vKey].moduleIdx > 0);
    //     bytes32 key = keccak256(abi.encodePacked(vKey,userId));
    //     userTags[key] &= tags;
    // }
    
    /*
    
    FUNCTIONS TO BE IMPLEMENTED:
    
    +function getManifests(string memory location, bytes32[] memory users) public view returns (ModuleInfo[] memory) { } // for popup
    +function getModules(string memory location, bytes32[] memory users) public view returns (string[] memory) { }
    +function getVersions(string memory name, string memory branch) public view returns (string[] memory) { }
    +function resolveToManifest(string memory name, string memory branch, string memory version) public view returns (VersionInfo memory) { }
    +function addModule(Manifest memory manifest) public { }
    function transferOwnership(string memory moduleName, address newOwner) public { }
    function addLocation(string memory moduleName, string memory location) public { }
    function removeLocation(string memory location, uint256 moduleNameIndex, string memory moduleName) public { }
    function addDistUri(string memory name, string memory branch, string memory version, string memory distUri) public { }
    function removeHashUri(string memory name, string memory branch, string memory version, string memory distUri) public { }
    
    */
}