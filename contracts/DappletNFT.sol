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

    constructor() ERC721("Dapplet", "DPL") {}
    
    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

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

        string memory image;
        if (module.image.hash != bytes32(0x0)) {
            string[] memory supportedProtocols = new string[](3);
            supportedProtocols[0] = "ipfs://";
            supportedProtocols[1] = "ar://";
            supportedProtocols[2] = "https://";

            (bool isImageFound, uint256 imageUriIndex) = _findFirstOccurrence(module.image.uris, supportedProtocols);
            
            if (isImageFound) {
                image = module.image.uris[imageUriIndex];
            } else {
                (bool isIconFound, uint256 iconUriIndex) = _findFirstOccurrence(module.icon.uris, supportedProtocols);
                if (isIconFound) {
                    image = module.icon.uris[iconUriIndex];
                }
            }
        }

        string memory imageJsonRow = bytes(image).length > 0 ? string(abi.encodePacked(
            '"image":"', image, '",'
        )) : '';

        string memory description = string(abi.encodePacked(
            'This NFT is a proof of ownership of the \\"', module.title, '\\".\\n\\n',
            module.description, '\\n\\n',
            'This module is a part of the Dapplets Project ecosystem for augmented web. All modules are available in the Dapplets Store.'
        ));

        string memory moduleTypeString = (module.moduleType == 1) 
            ? "Dapplet" 
            : (module.moduleType == 2) 
                ? "Adapter" 
                : (module.moduleType == 3)
                    ? "Library"
                    : (module.moduleType == 4)
                        ? "Interface"
                        : "Module";

        string memory attributes = string(abi.encodePacked(
            '[{',
                '"trait_type":"Name",', 
                '"value":"', module.name, '"',
            '},{',
                '"trait_type":"Module Type",',
                '"value":"', moduleTypeString, '"'
            '}]'
        ));

        bytes memory dataURI = abi.encodePacked(
            '{',
                '"name":"', moduleTypeString, ' \\"', module.title, '\\"",',
                imageJsonRow,
                '"description":"', description, '",',
                '"attributes":', attributes,
            '}'
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(dataURI)
            )
        );
    }

    function contractURI() public pure returns (string memory) {
        bytes memory dataURI = abi.encodePacked(
            '{',
                '"name": "Dapplets",',
                '"description": "Dapplets Project is an open Augmented Web infrastructure for decentralized Apps (dapplets), all powered by crypto technologies. Our system is open-source and available to developers anywhere in the world.",',
                '"image": "ipfs://QmbU1jjPeHN4ikENaAatqkNPPNL4tKByJg7B4be4ESWDwn",',
                '"external_link": "https://dapplets.org"',
            '}'
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(dataURI)
            )
        );
    }

    // -------------------------------------------------------------------------
    // State modifying functions
    // -------------------------------------------------------------------------

    function safeMint(address to, uint256 tokenId) public onlyOwner {
        _safeMint(to, tokenId);
    }

    // -------------------------------------------------------------------------
    // Internal functions
    // -------------------------------------------------------------------------

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _findFirstOccurrence(string[] memory where, string[] memory what) internal pure returns (bool isFound, uint256 index) {
        for (uint256 i = 0; i < what.length; i++) {
            for (uint256 j = 0; j < where.length; j++) {
                if (_startsWith(where[j], what[i])) {
                    return (true, j);
                }
            }
        }
        
        return (false, 0);
    }

    function _startsWith(string memory where, string memory what) internal pure returns (bool) {
        bytes memory whereBytes = bytes(where);
        bytes memory whatBytes = bytes(what);

        if (whatBytes.length > whereBytes.length) {
            return false;
        }

        for (uint256 i = 0; i < whatBytes.length; i++) {
            if (whereBytes[i] != whatBytes[i]) {
                return false;
            }
        }

        return true;
    }
}
