pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;


// ToDo: maybe hash is better to use?
// hash(name+branch, version)

/// @author Dapplets Team
/// @title Dapplet Registry
contract DappletRegistry {
    /////////////////////////////////////
    // MODULES REGISTRY
    /////////////////////////////////////

    struct ModuleNameInfo {
        address owner;
        mapping(string => ModuleBranchInfo) infoByBranches;
    }

    struct ModuleBranchInfo {
        string[] versions; // ToDo: fix double storing of versions
        mapping(string => bytes32) hashByVersion;
    }

    // // ToDo: read operations are free, because of it's better to optimize writing.
    // // Low level: 1) call, 2) send tx

    // // ToDo: does public accessor generate setter?
    mapping(string => ModuleNameInfo) public infoByName;

    /// Get versions of specific module's branch
    /// @param name name of module
    /// @param branch branch of module
    /// @return array of module versions
    function getVersions(string memory name, string memory branch)
        public
        view
        returns (string[] memory)
    {
        return infoByName[name].infoByBranches[branch].versions;
    }

    /// Resolve module to URIs
    /// @param name name of module
    /// @param branch branch of module
    /// @param version branch of module
    /// @return hash keccak-256 hash of module's manifest
    /// @return uris array of URIs
    function resolveToUris(
        string memory name,
        string memory branch,
        string memory version
    ) public view returns (bytes32 hash, string[] memory uris) {
        hash = infoByName[name].infoByBranches[branch].hashByVersion[version];
        uris = urisByHash[hash].uris;
    }

    struct HashUri {
        bytes32 hash;
        string uri;
    }

    /// Add module with manifest hash. It's irreversible operation
    /// @param name name of module to be added
    /// @param branch branch of module to be added
    /// @param version version of module to be added
    /// @param hashUris keccak-256 hashes and URIs of module's objects. First element of array must be a manifest.
    function addModuleWithObjects(
        string memory name,
        string memory branch,
        string memory version,
        HashUri[] memory hashUris
    ) public {
        require(
            hashUris.length > 0,
            "Module must have objects with hashes and URIs."
        );

        // object registration
        for (uint256 i = 0; i < hashUris.length; i++) {
            addHashUri(hashUris[i].hash, hashUris[i].uri);
        }

        // module registration
        bytes32 manifestHash = hashUris[0].hash;
        addModule(name, branch, version, manifestHash);
    }

    struct AddModulesWithObjectsInput {
        string name;
        string branch;
        string version;
        HashUri[] hashUris;
    }

    /// Batch call of addModuleWithObjects() function
    /// @param input array of addModuleWithObjects() parameters
    function addModulesWithObjects(AddModulesWithObjectsInput[] memory input)
        public
    {
        for (uint256 i = 0; i < input.length; i++) {
            addModuleWithObjects(
                input[i].name,
                input[i].branch,
                input[i].version,
                input[i].hashUris
            );
        }
    }

    event ModuleAdded(
        string name,
        string branch,
        string version,
        bytes32 manifestHash
    );

    /// Add module with manifest hash. It's irreversible operation
    /// @param name name of module to be added
    /// @param branch branch of module to be added
    /// @param version version of module to be added
    /// @param manifestHash keccak-256 hash of module's manifest
    function addModule(
        string memory name,
        string memory branch,
        string memory version,
        bytes32 manifestHash
    ) public {
        // module ownership checking
        require(
            infoByName[name].owner == address(0x0) ||
                msg.sender == infoByName[name].owner,
            "This action can be done only by module's owner."
        );

        // manifest ownership checking
        require(
            urisByHash[manifestHash].owner == msg.sender,
            "Can not register a module with a foreign manifest."
        );

        // owning
        if (infoByName[name].owner == address(0x0)) {
            infoByName[name].owner = msg.sender;
        }

        ModuleBranchInfo storage info = infoByName[name].infoByBranches[branch];

        if (info.hashByVersion[version] == bytes32(0x0)) {
            info.versions.push(version);
            info.hashByVersion[version] = manifestHash;
        }

        // ToDo: check previous versions

        emit ModuleAdded(name, branch, version, manifestHash);
    }

    struct AddModulesInput {
        string name;
        string branch;
        string version;
        bytes32 manifestHash;
    }

    /// Batch call of addModule() function
    /// @param input array of addModule() parameters
    function addModules(AddModulesInput[] memory input) public {
        for (uint256 i = 0; i < input.length; i++) {
            addModule(
                input[i].name,
                input[i].branch,
                input[i].version,
                input[i].manifestHash
            );
        }
    }

    /////////////////////////////////////
    // LOCATIONS
    /////////////////////////////////////

    mapping(string => string[]) public modulesByLocation;

    /// Return module names by location
    /// @param location identifier of context type
    /// @return array of module names
    function getModules(string memory location)
        public
        view
        returns (string[] memory)
    {
        // ToDo: location must be array of strings
        // ToDo: how many modules can be returned?
        // ToDo: is it need to be optimized?

        return modulesByLocation[location];
    }

    /// Add location for module
    /// @param moduleName name of module
    /// @param location location of module to be added
    function addLocation(string memory moduleName, string memory location)
        public
    {
        require(
            infoByName[moduleName].owner != address(0x0),
            "No modules with this name exist"
        );
        require(
            infoByName[moduleName].owner == msg.sender,
            "This action can be done only by module's owner"
        );

        // ToDo: check empty strings everywhere
        modulesByLocation[location].push(moduleName);
    }

    struct AddLocationsInput {
        string moduleName;
        string location;
    }

    /// Batch call of addLocation() function
    /// @param input array of addLocation() parameters
    function addLocations(AddLocationsInput[] memory input) public {
        for (uint256 i = 0; i < input.length; i++) {
            addLocation(input[i].moduleName, input[i].location);
        }
    }

    /// Remove location of module
    /// @param moduleName name of module
    /// @param location location of module to be removed
    function removeLocation(
        string memory location,
        uint256 moduleNameIndex,
        string memory moduleName
    ) public {
        require(
            infoByName[moduleName].owner != address(0x0),
            "No modules with this name exist"
        );

        require(
            infoByName[moduleName].owner == msg.sender,
            "This action can be done only by module's owner"
        );

        string[] storage modules = modulesByLocation[location];

        require(modules.length > moduleNameIndex, "Invalid index.");

        require(
            areEqual(modules[moduleNameIndex], moduleName),
            "The module name found by the index is not the same."
        );

        // URI removing by index
        modules[moduleNameIndex] = modules[modules.length - 1];
        modules.pop();
    }

    /////////////////////////////////////
    // HASH-URI REGISTRY
    /////////////////////////////////////

    struct OwnedUris {
        address owner;
        string[] uris; // ToDo: maybe limited array to use here
    }

    mapping(bytes32 => OwnedUris) public urisByHash;

    /// Resolve object's hash to URIs
    /// @param hash keccak-256 hash of object
    /// @return array of URIs
    function hashToUris(bytes32 hash) public view returns (string[] memory) {
        return urisByHash[hash].uris;
    }

    /// Add URI for object's hash
    /// @param hash keccak-256 hash of object
    /// @param uri URI of object
    function addHashUri(bytes32 hash, string memory uri) public {
        require(
            urisByHash[hash].owner == address(0x0) ||
                msg.sender == urisByHash[hash].owner,
            "This action can be done only by object's owner"
        );

        urisByHash[hash].owner = msg.sender;
        urisByHash[hash].uris.push(uri);
    }

    /// Remove URI of object's hash by its array index
    /// @param hash keccak-256 hash of object
    /// @param uriIndex index of URI in urisByHash[hash].uris array
    function removeHashUri(bytes32 hash, uint256 uriIndex, string memory uri) public {
        require(
            urisByHash[hash].owner != address(0x0),
            "No objects with this hash exist"
        );

        require(
            urisByHash[hash].owner == msg.sender,
            "This action can be done only by object's owner"
        );

        string[] storage uris = urisByHash[hash].uris;

        require(uris.length > uriIndex, "Invalid index.");

        require(
            areEqual(uris[uriIndex], uri),
            "The address found by the index is not the same."
        );

        // URI removing by index
        uris[uriIndex] = uris[uris.length - 1];
        uris.pop();
    }

    /////////////////////////////////////
    // UTILITIES
    /////////////////////////////////////

    /// Compare strings
    /// @param a first string
    /// @param b second string
    function areEqual(string memory a, string memory b)
        public
        pure
        returns (bool)
    {
        // ToDo: it's expensive probably
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}
