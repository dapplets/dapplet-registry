// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import {DappletRegistry, ModuleInfo} from "./DappletRegistry.sol";

contract DappletNFT is ERC721, ERC721Enumerable, Ownable {
    using Strings for uint8;

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

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        DappletRegistry registry = DappletRegistry(owner());
        (ModuleInfo[] memory modules,,,) = registry.getModules(tokenId, 1);
        ModuleInfo memory module = modules[0];

        string memory description = string(abi.encodePacked(
            'This NFT is a proof of ownership of the \\"', module.title, '\\".\\n',
            module.description, '\\n',
            'This dapplet is a part of the Dapplets Project ecosystem for augmented web. All dapplets are available in the Dapplets Store.'
        ));

        bytes memory dataURI = abi.encodePacked(
            '{',
                '"name":"Dapplet \\"', module.title, '\\"",',
                '"description":"', description, '",'
                '"attributes":[{',
                    '"trait_type":"Name",', 
                    '"value":"', module.name, '"',
                '},{',
                    '"trait_type":"Module Type",', 
                    '"value":"', module.moduleType.toString(), '"',
                '}]',
                // Replace with extra ERC721 Metadata properties
            '}'
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(dataURI)
            )
        );
    }

    // ToDo: implement contract metadata
    // function contractURI() public view returns (string memory) {
    //     return "";
    // }
}
