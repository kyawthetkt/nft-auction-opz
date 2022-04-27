//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Nft.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Marketplace {

    // block.timestamp
    string public name;
    mapping(address => mapping(uint256 => Auction)) public nftAuctions;

    //Each Auction is unique to each NFT (contract + id pairing).
    struct Auction {
        uint256 highestBid;
        address highestBidder;
        address seller;
        uint128 minPrice;
        uint256 endDate;
        uint32 bidIncrementAmount;
    }

    /*╔═════════════════════════════╗
      ║           EVENTS            ║
      ╚═════════════════════════════╝*/
    event AuctionCreated(
        address nftContractAddress,
        uint256 tokenId,
        address seller,
        uint256 minPrice,
        uint256 endDate,
        uint32 bidIncrementAmount
    );

    event BidCreated(
        address nftContractAddress,
        uint256 tokenId,
        uint256 newAmount,
        address newBidder
    );

    event RefundedPreviousBidder(
        address nftContractAddress,
        uint256 tokenId,
        address prevBidder,
        uint256 prevBid
    );

    constructor(string memory _name) {
        name = _name;
    }

    // function _isERC20Auction(address _auctionERC20Token)
    //     internal
    //     pure
    //     returns (bool)
    // {
    //     return _auctionERC20Token != address(0);
    // }

    modifier isNotOnSale(address _nftContractAddress,uint256 _nftTokenId) {
        require(
            nftAuctions[_nftContractAddress][_nftTokenId].seller != msg.sender,
            "The Auction is already started."
        );
        _;
    }

    modifier isContract(address account)  {
        // This method relies on extcodesize, which returns 0 for contracts in
        // construction, since the code is only stored at the end of the
        // constructor execution.
        uint size;
        assembly {
            size := extcodesize(account)
        }
        require(size > 0, "Invalid NFT Collection Contract address.");
        _;
    }

    modifier isActive(address _nftContractAddress, uint256 _nftTokenId) {
        require(nftAuctions[_nftContractAddress][_nftTokenId].endDate > block.timestamp, "Inactive Auction.");
        _;
    }

    /*
    *  Create Auction
    */
    function createAuction(
        address _nftContractAddress,
        uint256 _nftTokenId,
        uint128 _minPrice,
        uint256 _endDate,
        uint32 _bidIncrementAmount
    ) external isContract(_nftContractAddress) {
        
        require(_endDate > block.timestamp, "Invalid auction end date.");
        
        require(IERC721(_nftContractAddress).ownerOf(_nftTokenId) == msg.sender, "Only NFT owner create.");
        
        nftAuctions[_nftContractAddress][_nftTokenId].seller = msg.sender;
        nftAuctions[_nftContractAddress][_nftTokenId].endDate = _endDate;
        nftAuctions[_nftContractAddress][_nftTokenId].minPrice = _minPrice;
        nftAuctions[_nftContractAddress][_nftTokenId].highestBid = _minPrice;
        nftAuctions[_nftContractAddress][_nftTokenId].bidIncrementAmount = _bidIncrementAmount;

        // Lock NFT in marketplace contract        
        IERC721(_nftContractAddress).transferFrom(msg.sender, address(this), _nftTokenId);
        require(
            IERC721(_nftContractAddress).ownerOf(_nftTokenId) == address(this),
            "NFT Transfer to Contract Failed."
        );
       

        emit AuctionCreated(
            _nftContractAddress,
            _nftTokenId,
            msg.sender,
            // _status,
            _minPrice,
            _endDate,
            _bidIncrementAmount
        );
    }

    function createBid(address _nftContractAddress, uint256 _nftTokenId, uint256 _newAmount) external returns(bool) {
        
        Auction storage nftAuction = nftAuctions[_nftContractAddress][_nftTokenId];

        // must not be auction owner
        require(msg.sender != nftAuction.seller, "Owner cannot create bid.");
        
        // check valid price
        require(_newAmount > nftAuction.highestBid, "New bid must be higher than current bid.");

        // [REFUND the previous bidder]
        address prevBidder = nftAuction.highestBidder;
        if (prevBidder != address(0)) {
            uint256 prevBid    = nftAuction.highestBid;
            (bool success, ) = prevBidder.call{value: prevBid, gas: 20000}("");
            require(!success, "Unable to refund to previous highest bidder.");
        }

        // emit refundedPreviousBidder(_nftContractAddress, _nftTokenId, prevBidder, prevBid);

        // [LOCKING the token] by transferring bidder token to marketplace account
        //** ERC20 paymentToken = ERC20(auction.addressPaymentToken);
        //** paymentToken.transferFrom(msg.sender, address(this), _newAmount);

        address payable newBidder = payable(msg.sender);
        nftAuction.highestBidder = newBidder;
        nftAuction.highestBid = _newAmount;

        emit BidCreated(_nftContractAddress, _nftTokenId, _newAmount, newBidder);

        return true;

    }

    function getAuction(address _nftContractAddress, uint256 _nftTokenId) external view returns(Auction memory obj)
    {
        return nftAuctions[_nftContractAddress][_nftTokenId];
    }
 
    /*
    * This method is called by the highest bidder of an auction
    */
    function settleAuction(address _nftContractAddress, uint256 _nftTokenId) external { 
        Auction storage auction = nftAuctions[_nftContractAddress][_nftTokenId];

        // Check valid _nftContractAddress and _nftTokenId pair
        require(auction.seller != address(0), "Invalid NFT Auction.");

        // Check highest bidder is the msg.sender
        require(auction.highestBidder == msg.sender, "Only Highest can claim.");

        // Transfer NFT to highest bidder
        _transferNft(_nftContractAddress, _nftTokenId, auction.highestBidder);

        // Transfer locked money to NFT Seller

        auction.highestBidder = address(0);
        auction.seller = address(0);
        auction.minPrice = 0;
        auction.bidIncrementAmount = 0;
    }

    function _transferNft(address _nftContractAddress, uint256 _nftTokenId, address _receiver) internal returns (bool) {
        IERC721(_nftContractAddress).transferFrom(address(this), _receiver, _nftTokenId);
        return true;
    }
 
}
