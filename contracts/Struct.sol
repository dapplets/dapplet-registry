// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

struct StorageRef {
    bytes32 hash;
    string[] uris;
}

// ToDo: introduce mapping for alternative sources,
struct ModuleInfo {
    uint8 moduleType;
    string name;
    string title;
    string description;
    StorageRef image;
    StorageRef manifest;
    StorageRef icon;
    string[] interfaces; //Exported interfaces in all versions. no duplicates.
    uint256 flags; // 255 bit - IsUnderConstruction
}

struct VersionInfo {
    uint256 modIdx;
    string branch;
    bytes4 version;
    StorageRef binary;
    bytes32[] dependencies; // key of module
    bytes32[] interfaces; //Exported interfaces. no duplicates.
    uint8 flags;
    bytes4 extensionVersion;
    uint256 createdAt;
}

struct VersionInfoDto {
    string branch;
    bytes4 version;
    StorageRef binary;
    DependencyDto[] dependencies; // key of module
    DependencyDto[] interfaces; //Exported interfaces. no duplicates.
    uint8 flags;
    bytes4 extensionVersion;
    uint256 createdAt;
}

struct DependencyDto {
    string name;
    string branch;
    bytes4 version;
}
