// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

library LinkedList {
    uint256 constant _NULL = 0x00000000;
    uint256 constant _HEAD = 0x00000000;
    uint256 constant _TAIL = 0xFFFFFFFF;

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
            uint256 next = self.map[current];
            if (next == _TAIL || next == _HEAD) break; // prevent exception on inconsistency
            current = result[i] = next;
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
        uint256 sumA = 0;
        uint256 sumB = 0;

        for (uint256 i = 0; i < links.length; i++) {
            Link memory link = links[i];
            uint256 prev = link.prev;
            uint256 next = link.next;

            // prevent duplicates
            for (uint256 j = 0; j < links.length; ++j) {
                if (i == j) continue; // skip itself
                require(
                    prev != links[j].prev &&
                        (next != links[j].next || next == _NULL),
                    "Pointers within one side must not be repeated"
                );
            }

            uint256 oldNext = self.map[prev];

            // Skip an existing link
            if (oldNext == next) continue;

            require(prev <= _TAIL && next <= _TAIL, "Maximum pointer exceeded");

            require(
                prev != next,
                "Circular dependency. Prev must not be equal Next."
            );

            // The sum of elements whose predecessors have added and elements removed from the list
            sumA += (next == _NULL) ? prev : next;

            // The sum of elements whose predecessors have been removed and elements added to the list
            sumB += (oldNext == _NULL)
                ? (prev == _HEAD) ? _TAIL : prev
                : oldNext;

            if (prev != _HEAD && next != _NULL && oldNext == _NULL) {
                self.size += 1;
            } else if (prev != _HEAD && next == _NULL && oldNext != _NULL) {
                self.size -= 1;
            }

            self.map[prev] = next;
        }

        require(sumA == sumB, "Inconsistent changes");
    }
}
