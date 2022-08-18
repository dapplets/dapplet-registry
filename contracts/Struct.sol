// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

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
    StorageRef fullDescription;
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
    bytes3 extensionVersion;
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
    bytes3 extensionVersion;
}

struct DependencyDto {
    string name;
    string branch;
    uint8 major;
    uint8 minor;
    uint8 patch;
}

struct SemVer {
    uint8 major;
    uint8 minor;
    uint8 patch;
}