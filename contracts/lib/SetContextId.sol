// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.6.0) (utils/structs/EnumerableSet.sol)

pragma solidity ^0.8.0;

library SetContextId {
    struct Set {
        bytes[] _values;
        mapping(bytes => uint256) _indexes;
    }

    function _add(Set storage set, string memory value) private returns (bool) {
        if (!_contains(set, value)) {
            set._values.push(bytes(value));

            set._indexes[bytes(value)] = set._values.length;
            return true;
        } else {
            return false;
        }
    }

    function _remove(Set storage set, string memory value)
        private
        returns (bool)
    {
        uint256 valueIndex = set._indexes[bytes(value)];

        if (valueIndex != 0) {
            uint256 toDeleteIndex = valueIndex - 1;
            uint256 lastIndex = set._values.length - 1;

            if (lastIndex != toDeleteIndex) {
                bytes memory lastValue = set._values[lastIndex];

                set._values[toDeleteIndex] = lastValue;
                set._indexes[lastValue] = valueIndex;
            }

            set._values.pop();

            delete set._indexes[bytes(value)];

            return true;
        } else {
            return false;
        }
    }

    function _contains(Set storage set, string memory value)
        private
        view
        returns (bool)
    {
        return set._indexes[bytes(value)] != 0;
    }

    function _length(Set storage set) private view returns (uint256) {
        return set._values.length;
    }

    function _values(Set storage set) private view returns (bytes[] memory) {
        return set._values;
    }

    // StringSet

    struct StringSet {
        Set _inner;
    }

    function add(StringSet storage set, string memory value)
        internal
        returns (bool)
    {
        return _add(set._inner, value);
    }

    function remove(StringSet storage set, string memory value)
        internal
        returns (bool)
    {
        return _remove(set._inner, value);
    }

    function contains(StringSet storage set, string memory value)
        internal
        view
        returns (bool)
    {
        return _contains(set._inner, value);
    }

    function length(StringSet storage set) internal view returns (uint256) {
        return _length(set._inner);
    }

    function values(StringSet storage set)
        internal
        view
        returns (string[] memory)
    {
        bytes[] memory store = _values(set._inner);
        string[] memory result;

        /// @solidity memory-safe-assembly
        assembly {
            result := store
        }

        return result;
    }
}
