// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

using LinkedList for LinkedList.LinkedListUint32;

library LinkedList {

    uint32 constant _NULL = 0x00000000;
    uint32 constant _HEAD = 0x00000000;
    uint32 constant _TAIL = 0xffffffff;

    struct LinkedListUint32 {
        mapping(uint32 => uint32) map;
        uint32 size;
        bool initialized;
    }

    function items(LinkedListUint32 storage self) internal view returns(uint32[] memory result) {
        result = new uint32[](self.size);
        uint32 current = _HEAD;
        for (uint32 i = 0; i < self.size; ++i) {
            current = result[i] = self.map[current];
        }
    }

    function contains(LinkedListUint32 storage self, uint32 value) internal view returns(bool) {
        if (self.map[value] != _NULL) {
            return true;
        } else {
            return false;
        }
    }

    function linkify(LinkedListUint32 storage self, uint32 a, uint32 b) internal {
        if (a != _HEAD && b != _NULL && self.map[a] == _NULL) {
            self.size += 1;
        } else if (a != _HEAD && b == _NULL && self.map[a] != _NULL) {
            self.size -= 1;
        }

        self.map[a] = b;
    }
}

struct ListLink {
    uint32 currentModuleIdx;
    uint32 nextModuleIdx;
}

contract Listings {

    address[] listers;
    mapping(address => LinkedList.LinkedListUint32) listingByLister;

    function getLinkedListSize(address lister) public view returns (uint32) {
        return listingByLister[lister].size;
    }

    function getLinkedList(address lister) public view returns (uint32[] memory) {
        return listingByLister[lister].items();
    }

    function getListers() public view returns (address[] memory) {
        return listers;
    }

    function containsModuleInListing(address lister, uint32 moduleIdx) public view returns (bool) {
        return listingByLister[lister].contains(moduleIdx);
    }

    function changeMyList(ListLink[] memory links) public {
        LinkedList.LinkedListUint32 storage listing = listingByLister[msg.sender];

        // Save listers existence in the listings map to reduce gas consumption
        if (listing.initialized == false) {
            listing.initialized = true;
            listers.push(msg.sender);
        }

        for (uint32 i = 0; i < links.length; i++) {
            ListLink memory link = links[i];
            listing.linkify(link.currentModuleIdx, link.nextModuleIdx);
            // ToDo: check consistency of the linked list
        }
    }
}