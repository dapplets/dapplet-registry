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

    constructor() ERC721("Dapplets NFTs Test 1", "DNFT1") {}

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
        ModuleInfo memory module = registry.getModuleByIndex(tokenId);

        string memory description = string(abi.encodePacked(
            'This NFT is a proof of ownership of the \\"', module.title, '\\".\\n',
            module.description, '\\n',
            'This dapplet is a part of the Dapplets Project ecosystem for augmented web. All dapplets are available in the Dapplets Store.'
        ));

        string memory image = string(abi.encodePacked(
            'https://dapplet-api.s3.nl-ams.scw.cloud/',
            bytes32ToString(module.icon.hash)
        ));

        string memory attributes = string(abi.encodePacked(
            '[{',
                '"trait_type":"Name",', 
                '"value":"', module.name, '"',
            '},{',
                '"trait_type":"Module Type",',  // ToDo: invalid trait type
                '"value":"', module.moduleType.toString(), '"',
            '}]'
        ));

        bytes memory dataURI = abi.encodePacked(
            '{',
                '"name":"Dapplet \\"', module.title, '\\"",',
                '"image":"', image, '",',
                '"description":"', description, '",',
                '"attributes":', attributes,
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

    function toHex16 (bytes16 data) internal pure returns (bytes32 result) {
        result = bytes32 (data) & 0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000 |
            (bytes32 (data) & 0x0000000000000000FFFFFFFFFFFFFFFF00000000000000000000000000000000) >> 64;
        result = result & 0xFFFFFFFF000000000000000000000000FFFFFFFF000000000000000000000000 |
            (result & 0x00000000FFFFFFFF000000000000000000000000FFFFFFFF0000000000000000) >> 32;
        result = result & 0xFFFF000000000000FFFF000000000000FFFF000000000000FFFF000000000000 |
            (result & 0x0000FFFF000000000000FFFF000000000000FFFF000000000000FFFF00000000) >> 16;
        result = result & 0xFF000000FF000000FF000000FF000000FF000000FF000000FF000000FF000000 |
            (result & 0x00FF000000FF000000FF000000FF000000FF000000FF000000FF000000FF0000) >> 8;
        result = (result & 0xF000F000F000F000F000F000F000F000F000F000F000F000F000F000F000F000) >> 4 |
            (result & 0x0F000F000F000F000F000F000F000F000F000F000F000F000F000F000F000F00) >> 8;
        result = bytes32 (0x3030303030303030303030303030303030303030303030303030303030303030 +
            uint256 (result) +
            (uint256 (result) + 0x0606060606060606060606060606060606060606060606060606060606060606 >> 4 &
            0x0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F) * 7);
    }

    function toHex(bytes32 data) public pure returns (string memory) {
        return string(abi.encodePacked(toHex16 (bytes16 (data)), toHex16 (bytes16 (data << 128))));
    }

    function bytes32ToString(bytes32 _bytes32) public pure returns (string memory) {
        uint8 i = 0;
        bytes memory bytesArray = new bytes(64);
        for (i = 0; i < bytesArray.length; i++) {

            uint8 _f = uint8(_bytes32[i/2] & 0x0f);
            uint8 _l = uint8(_bytes32[i/2] >> 4);

            bytesArray[i] = toByte(_l);
            i = i + 1;
            bytesArray[i] = toByte(_f);
        }
        return string(bytesArray);
    }

    function toByte(uint8 _uint8) public pure returns (bytes1) {
        if(_uint8 < 10) {
            return bytes1(_uint8 + 48);
        } else {
            return bytes1(_uint8 + 87);
        }
    }
}
