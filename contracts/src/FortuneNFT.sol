// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FortuneNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;
    mapping(uint256 => string) public fortunes;

    event FortuneMinted(address indexed user, uint256 tokenId, string fortune);

    constructor() ERC721("AstroFortune", "AFRT") Ownable(msg.sender) {}

    function mintFortune(
        address to,
        string memory fortune,
        string memory tokenURI
    ) external returns (uint256) {
        _tokenIds++;
        uint256 newId = _tokenIds;
        _mint(to, newId);
        _setTokenURI(newId, tokenURI);
        fortunes[newId] = fortune;
        emit FortuneMinted(to, newId, fortune);
        return newId;
    }

    function totalMinted() external view returns (uint256) {
        return _tokenIds;
    }
}
