pragma solidity >=0.4.25 <0.7.0;

library HelpersLib {
    // ToDo: what does "pure" mean?
    // "view" doesn't change state
    function areEqual(string memory a, string memory b) public pure returns(bool) {
        // ToDo: it's expensive probably
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}