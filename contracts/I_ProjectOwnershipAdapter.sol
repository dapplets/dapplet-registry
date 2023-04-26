// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface I_ProjectOwnershipAdapter {
    function ownerOf(string memory projectId) external view returns (address);
}