pragma solidity >=0.4.25 <0.7.0;
pragma experimental ABIEncoderV2;

import "./HelpersLib.sol";


// ToDo: maybe hash is better to use?
// hash(name+branch, version)

contract DappletRegistry {
    struct ModuleNameInfo {
        address owner;
        mapping(string => ModuleBranchInfo) infoByBranches;
    }

    struct ModuleBranchInfo {
        string[] versions; // ToDo: fix double storing of versions
        mapping(string => string[]) urisByVersion;
    }

    struct AddModuleInput {
        string name;
        string branch;
        string version;
        string uri;
    }

    struct AddLocationInput {
        string name;
        string branch;
        string location;
    }

    // ToDo: read operations are free, because of it's better to optimize writing.
    // Low level: 1) call, 2) send tx

    // ToDo: does public accessor generate setter?
    mapping(string => ModuleNameInfo) private _infoByName;

    // ToDo: is it better to replace array[2] to struct? If yes, how to name such struct?
    // ToDo: fix double storing of [name, branch]
    mapping(string => string[2][]) private _modulesByLocation; // location => [name, branch][]

    function getVersions(string memory name, string memory branch)
        public
        view
        returns (string[] memory)
    {
        return _infoByName[name].infoByBranches[branch].versions;
    }

    function resolveToUri(
        string memory name,
        string memory branch,
        string memory version
    ) public view returns (string[] memory) {
        return _infoByName[name].infoByBranches[branch].urisByVersion[version];
    }

    // ToDo: location must be array of strings
    // ToDo: how many modules can be returned?
    // ToDo: is it need to be optimized?
    function getModules(string memory location)
        public
        view
        returns (string[2][] memory)
    {
        return _modulesByLocation[location];
    }

    function addModule(
        string memory name,
        string memory branch,
        string memory version,
        string memory uri
    ) public {
        // ToDo: find info about "null" in solidity docs

        // ownership checking
        require(
            _infoByName[name].owner == address(0x0) ||
                msg.sender == _infoByName[name].owner
        ); // second parameter - text of error

        // owning
        if (_infoByName[name].owner == address(0x0)) {
            _infoByName[name].owner = msg.sender;
        }

        // ToDo: how to prevent long chains _infoByName[name].infoByBranches[branch].urisByVersion[version];

        ModuleBranchInfo storage info = _infoByName[name]
            .infoByBranches[branch];

        uint256 urisCount = info.urisByVersion[version].length;

        if (urisCount == 0) {
            info.versions.push(version);
        }

        // ToDo: check previous versions

        // ToDo: check existence of the uri? Dima: create map uri => boolean;
        info.urisByVersion[version].push(uri);
    }

    function addModules(AddModuleInput[] memory modules) public {
        for (uint256 i = 0; i < modules.length; i++) {
            addModule(modules[i].name, modules[i].branch, modules[i].version, modules[i].uri);
        }
    }

    // ToDo: is it necessary to bind branch? maybe only name is enough?
    function addLocation(
        string memory name,
        string memory branch,
        string memory location
    ) public {
        require(_infoByName[name].infoByBranches[branch].versions.length != 0); // ToDo: how to throw specific error? Dima: revert
        // ToDo: check empty strings everywhere
        _modulesByLocation[location].push([name, branch]);
    }

    function addLocations(AddLocationInput[] memory locations) public {
        for (uint256 i = 0; i < locations.length; i++) {
            addLocation(locations[i].name, locations[i].branch, locations[i].location);
        }
    }

    function removeLocation(
        string memory name,
        string memory branch,
        string memory location
    ) public {
        uint256 length = _modulesByLocation[location].length;

        if (length == 0) return;

        // ToDo: how to optimize it? Dima: use map
        for (uint256 i = 0; i < length; i++) {
            if (
                HelpersLib.areEqual(_modulesByLocation[location][i][0], name) &&
                HelpersLib.areEqual(_modulesByLocation[location][i][1], branch)
            ) {
                _modulesByLocation[location][i] = _modulesByLocation[location][length -
                    1];
                _modulesByLocation[location].pop(); // ToDo: or delete _modulesByLocation[location][length - 1] ? Dima: delete maybe just make it empty.
                break;
            }
        }
    }
}

/*

map name|hash => array of [branch, version[]][]
version 4 byte = major, minor, patch

map serialize(name+branch+version) => array of uris[]

add module:
if (binding exists) add no; 
if (binding not exists) {
   if (binding exists previous) {
      // 
   }
}


mapping (string => ModuleNameInfo) private _infoByName;

var map1 = {
    "twitter-adapter": [
        ["default", ["0.1.0", "0.1.1", "0.1.2", "0.1.3"]],
        ["legacy", ["0.1.0", "0.1.1", "0.1.2", "0.1.3"]],
        ["new", ["0.1.0", "0.1.1", "0.1.2", "0.1.3"]]
    ]
};

var map3 = {
    "twitter-adapter": [
        ["0.1.0", "0.1.1", "0.1.2", "0.1.3"], // 0 - default
        ["0.1.0", "0.1.1", "0.1.2", "0.1.3"], // legacy
        ["0.1.0", "0.1.1", "0.1.2", "0.1.3"] // new
    ]
};

var branches = [
    "default", "legacy", "new"
] // 1. find branch index at the client side
// 2. read function (name string) => index 
// try to write simple contract with loops

var map2 = {
    "twitter-adapter": [
        ["default", "0.1.0"],
        ["default", "0.1.1"],
        ["default", "0.1.2"],
        ["default", "0.1.3"],
        ["legacy", "0.1.0"],
        ["legacy", "0.1.1"],
        ["legacy", "0.1.2"],
        ["legacy", "0.1.3"],
        ["new", "0.1.0"],
        ["new", "0.1.1"],
        ["new", "0.1.2"],
        ["new", "0.1.3"]
    ]
};

var map3 = {
  "twitter-adapter#default@0.1.0": ["ipfs://jnJNghBVSs", "bzz://jnJNghBVSs"],
  "twitter-adapter#default@0.1.1": ["ipfs://jnJNghBVSs", "bzz://jnJNghBVSs"]
};

function addModule() {
    if (binding exists) add no; 
    if (binding not exists) {
        if (binding exists previous) {
          // 
        }
    }
    
    if ()
}

// build dependency tree
// locator twitter.com => [contract] => adapters, features with all versions (link between adapter and feature is located in manifest.json)
// locator twitter.com, filter => [contract] => adapters, features with filtered versions


*/
