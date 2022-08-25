// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

library LinkedList {
    uint256 constant _NULL =
        0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 constant _HEAD =
        0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 constant _TAIL =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

    struct LinkedListUint32 {
        mapping(uint256 => uint256) map;
        uint256 size;
        bool initialized;
    }

    struct Link {
        uint256 prev;
        uint256 next;
    }

    function items(LinkedListUint32 storage self)
        internal
        view
        returns (uint256[] memory result)
    {
        result = new uint256[](self.size);
        uint256 current = _HEAD;
        for (uint256 i = 0; i < self.size; ++i) {
            current = result[i] = self.map[current];
        }
    }

    function contains(LinkedListUint32 storage self, uint256 value)
        internal
        view
        returns (bool)
    {
        if (self.map[value] != _NULL) {
            return true;
        } else {
            return false;
        }
    }

    function linkify(LinkedListUint32 storage self, Link[] memory links)
        internal
        returns (bool isNewList)
    {
        // Save listers existence in the listings map to reduce gas consumption
        if (self.initialized == false) {
            isNewList = self.initialized = true;
            isNewList = true;
        }

        // Count inconsistent changes
        int64 scores = 0;

        for (uint256 i = 0; i < links.length; i++) {
            Link memory link = links[i];

            uint256 prev = link.prev;
            uint256 next = link.next;
            uint256 oldNext = self.map[prev];

            // Skip an existing link
            if (oldNext == next) continue;

            // The sum of the values of the elements whose predecessor has changed
            scores += int64(uint64((next == 0) ? prev : next));

            // The diff of the values of the elements whose that have lost their predecessors
            scores -= int64(
                uint64((oldNext == 0) ? (prev == 0) ? _TAIL : prev : oldNext)
            );

            if (prev != _HEAD && next != _NULL && self.map[prev] == _NULL) {
                self.size += 1;
            } else if (
                prev != _HEAD && next == _NULL && self.map[prev] != _NULL
            ) {
                self.size -= 1;
            }

            self.map[prev] = next;
        }

        require(scores == 0, "Inconsistent changes");
    }
}
