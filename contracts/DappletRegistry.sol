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

    struct Manifest {
       bool initialized;
       string name;
       string branch;
       string version;
       string title;
       string description;
       string mod_type;
       string author;
       bytes32 distHash; // hash of bundle
       string[] distUris;
       bytes32 iconHash;
       string[] iconUris;
       string[2][] dependencies;
    }

    struct ModuleBranchInfo {
        string[] versions; // ToDo: fix double storing of versions
        mapping(string => Manifest) manifestByVersion;
    }

    // // ToDo: read operations are free, because of it's better to optimize writing.
    // // Low level: 1) call, 2) send tx

    // // ToDo: does public accessor generate setter?
    mapping(string => ModuleNameInfo) public infoByName;

    function getManifests(string memory location) public view returns (Manifest[] memory) {
        uint256 n = 0;
        string memory DEFAULT_BRANCH = "default";

        string[] memory names = getModules(location);
        for (uint256 i = 0; i < names.length; i++) {
            n += getVersions(names[i], DEFAULT_BRANCH).length;
        }

        Manifest[] memory manifests = new Manifest[](n);
        for (uint256 i = 0; i < names.length; i++) {
            string[] memory versions = getVersions(names[i], DEFAULT_BRANCH);
            for (uint256 j = 0; j < versions.length; j++) {
                Manifest memory manifest = resolveToManifest(names[i], DEFAULT_BRANCH, versions[j]);
                manifest.name = names[i];
                manifest.branch = DEFAULT_BRANCH;
                manifest.version = versions[j];
                manifests[--n] = manifest;
            }
        }

        return manifests;
    }

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
    /// @return Manifest structure of module
    function resolveToManifest(
        string memory name,
        string memory branch,
        string memory version
    ) public view returns (Manifest memory) {
        return infoByName[name].infoByBranches[branch].manifestByVersion[version];
    }

    struct HashUri {
        bytes32 hash;
        string uri;
    }

    event ModuleAdded(
        string name,
        string branch,
        string version,
        Manifest manifest
    );

    /// Add module with manifest hash. It's irreversible operation
    /// @param name name of module to be added
    /// @param branch branch of module to be added
    /// @param version version of module to be added
    /// @param manifest Manifest structure of module
    function addModule(
        string memory name,
        string memory branch,
        string memory version,
        Manifest memory manifest
    ) public {
        // module ownership checking
        require(
            infoByName[name].owner == address(0x0) ||
                msg.sender == infoByName[name].owner,
            "This action can be done only by module's owner."
        );

        // owning
        if (infoByName[name].owner == address(0x0)) {
            infoByName[name].owner = msg.sender;
        }

        ModuleBranchInfo storage info = infoByName[name].infoByBranches[branch];

        if (info.manifestByVersion[version].initialized == false) {
            info.versions.push(version);
            manifest.initialized = true;
            info.manifestByVersion[version] = manifest;
        }

        // ToDo: check previous versions

        emit ModuleAdded(name, branch, version, manifest);
    }

    struct AddModulesInput {
        string name;
        string branch;
        string version;
        Manifest manifest;
    }

    /// Batch call of addModule() function
    /// @param input array of addModule() parameters
    function addModules(AddModulesInput[] memory input) public {
        for (uint256 i = 0; i < input.length; i++) {
            addModule(
                input[i].name,
                input[i].branch,
                input[i].version,
                input[i].manifest
            );
        }
    }

    /// Transfer ownership of a module namespace
    /// @param moduleName name of module
    /// @param newOwner address of new owner
    function transferOwnership(string memory moduleName, address newOwner)
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

        infoByName[moduleName].owner = newOwner;
    }

    /////////////////////////////////////
    // LOCATIONS
    /////////////////////////////////////

    // 1. tagging
    // 2. return manifest in resolveToUris
    // 3. merge functions getModules, getVersions, resolveToUris

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

    function addDistUri(string memory name, string memory branch, string memory version, string memory distUri) public {
        // module ownership checking
        require(
            infoByName[name].owner == address(0x0) ||
                msg.sender == infoByName[name].owner,
            "This action can be done only by module's owner."
        );

        infoByName[name].infoByBranches[branch].manifestByVersion[version].distUris.push(distUri);
    }

    struct AddHashUrisInput {
        string name;
        string branch;
        string version;
        string distUri;
    }

    /// Batch call of addHashUri() function
    /// @param input array of addHashUri() parameters
    function addDistUris(AddHashUrisInput[] memory input) public {
        for (uint256 i = 0; i < input.length; i++) {
            addDistUri(input[i].name, input[i].branch, input[i].version, input[i].distUri);
        }
    }

    function removeHashUri(string memory name, string memory branch, string memory version, string memory distUri) public {
        // module ownership checking
        require(
            infoByName[name].owner == address(0x0) ||
                msg.sender == infoByName[name].owner,
            "This action can be done only by module's owner."
        );

        string[] storage distUris = infoByName[name].infoByBranches[branch].manifestByVersion[version].distUris;

        for (uint256 i = 0; i < distUris.length; ++i) {
            if (areEqual(distUris[i], distUri)) {
                distUris[i] = distUris[distUris.length - 1];
                distUris.pop();
            }
        }

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
