//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract ERC721Contract is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor(string memory name, string memory symbol)
        ERC721(name, symbol)
    {}

    // function mint(address to, uint256 tokenId) external {
    function mintNft(address to, string memory metadataURI) external returns(uint256) {
         _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        return tokenId;
    } 
}
