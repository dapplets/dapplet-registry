// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DappletNFT is ERC721, ERC721Enumerable, Ownable {
    constructor() ERC721("Dapplets NFTs", "DNFTs") {}

    function safeMint(address to, uint256 tokenId) public onlyOwner {
        _safeMint(to, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function getModulesIndexes(
        address owner,
        uint256 offset,
        uint256 limit,
        bool reverse
    ) public view returns (uint256[] memory dappIndxs, uint256 total) {
        if (limit == 0) {
            limit = 20;
        }

        total = balanceOf(owner);

        if (limit > total - offset) {
            limit = total - offset;
        }

        dappIndxs = new uint256[](limit);
        for (uint256 i = 0; i < limit; ++i) {
            uint256 idx = (reverse) ? (total - offset - 1 - i) : (offset + i);
            dappIndxs[i] = tokenOfOwnerByIndex(owner, idx);
        }
    }
}
