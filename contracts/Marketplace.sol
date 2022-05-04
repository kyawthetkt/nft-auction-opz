//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./ERC721Contract.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Marketplace {

    // block.timestamp
    string public name;
    mapping(address => mapping(uint256 => Auction)) public nftAuctions;
    mapping(address => uint256) failedTransferCredits;

    //Each Auction is unique to each NFT (contract + id pairing).
    struct Auction {
        uint256 highestBid;
        address highestBidder;
        address seller;
        address erc20Address;
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
        address erc20Address,
        uint256 minPrice,
        uint256 endDate,
        uint32 bidIncrementAmount
    );

    event BidCreated(
        address nftContractAddress,
        uint256 tokenId,
        address erc20Address,
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
        address _erc20Address,
        uint128 _minPrice,
        uint256 _endDate,
        uint32 _bidIncrementAmount
    ) external isContract(_nftContractAddress) {
        
        require(_endDate > (block.timestamp * 1000), "Invalid auction end date.");
        
        require(IERC721(_nftContractAddress).ownerOf(_nftTokenId) == msg.sender, "Only NFT owner can create.");
        
        nftAuctions[_nftContractAddress][_nftTokenId].seller = msg.sender;
        nftAuctions[_nftContractAddress][_nftTokenId].endDate = _endDate;
        // nftAuctions[_nftContractAddress][_nftTokenId].endDate = block.timestamp + _endDate;
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
            _erc20Address,
            _minPrice,
            _endDate,
            _bidIncrementAmount
        );
    }

    function createBid(address _nftContractAddress, uint256 _nftTokenId, address _erc20Address, uint256 _newAmount) external payable returns(bool) {
        
        Auction storage auction = nftAuctions[_nftContractAddress][_nftTokenId];

        require(isOpenAuction(_nftContractAddress, _nftTokenId), "Auction is ended.");

        // must not be auction owner
        require(msg.sender != auction.seller, "Owner cannot create bid.");
        
        // check valid price
        require(_newAmount > auction.highestBid, "New bid must be higher than current bid.");

        // [REFUND the previous bidder]
        if (auction.highestBidder != address(0)) {
            _payout(_nftContractAddress, _nftTokenId, auction.highestBidder, auction.highestBid);
        }        

        address payable newBidder = payable(msg.sender);
        auction.highestBidder = newBidder;
        auction.erc20Address = _erc20Address;
        auction.highestBid = _newAmount;
        emit BidCreated(_nftContractAddress, _nftTokenId, _erc20Address, _newAmount, newBidder);

        return true;

    }

    function getAuction(address _nftContractAddress, uint256 _nftTokenId) external view returns(Auction memory obj)
    {
        // return nftAuctions[_nftContractAddress][_nftTokenId];        
        Auction storage auction = nftAuctions[_nftContractAddress][_nftTokenId];
        require(auction.seller != address(0), "Invalid NFT Auction.");
        return auction;
    }

    // Test Case Not Done
    // function isEndedAuction(address _nftContractAddress, uint256 _nftTokenId) external view returns(bool)
    function isOpenAuction(address _nftContractAddress, uint256 _nftTokenId) public view returns(bool)
    {
        // return nftAuctions[_nftContractAddress][_nftTokenId];        
        Auction storage auction = nftAuctions[_nftContractAddress][_nftTokenId];
        // require(auction.seller != address(0), "Invalid NFT Auction.");
        // return auction.endDate < (block.timestamp * 1000);
        if ((block.timestamp * 1000) >= auction.endDate) return false;
        return true;
        // return (block.timestamp * 1000) >= auction.endDate;
    }
 
    /*
    * This method is called by nft owner or bidder or marketplace
    */
    function settleAuction(address _nftContractAddress, uint256 _nftTokenId) external { 
        Auction storage auction = nftAuctions[_nftContractAddress][_nftTokenId];

        // Check valid _nftContractAddress and _nftTokenId pair
        require(auction.seller != address(0), "Invalid NFT Auction.");

        // Check highest bidder is the msg.sender
        require(auction.highestBidder == msg.sender, "Only Highest can claim.");

        // Transfer NFT to highest bidder
        _transferNft(_nftContractAddress, _nftTokenId, auction.highestBidder);

        if (auction.highestBidder != address(0)) {
            _payout(_nftContractAddress, _nftTokenId, auction.highestBidder, auction.highestBid);
        }

        // Transfer locked money to NFT Seller
        auction.highestBidder = address(0);
        auction.seller = address(0);
        auction.erc20Address = address(0);
        auction.minPrice = 0;
        auction.bidIncrementAmount = 0;
    }

    function _isERC20Auction(address _auctionERC20Token)
        internal
        pure
        returns (bool)
    {
        return _auctionERC20Token != address(0);
    }

    function _payout(
        address _nftContractAddress,
        uint256 _nftTokenId,
        address _recipient,
        uint256 _amount
    ) internal {
        address auctionERC20Token = nftAuctions[_nftContractAddress][_nftTokenId].erc20Address;

        if (_isERC20Auction(auctionERC20Token)) {
            IERC20(auctionERC20Token).transfer(_recipient, _amount);
        } else {
            // attempt to send the funds to the recipient
            (bool success, ) = payable(_recipient).call{
                value: _amount,
                gas: 20000
            }("");
            // if it failed, update their credit balance so they can pull it later
            if (!success) {
                failedTransferCredits[_recipient] =
                    failedTransferCredits[_recipient] +
                    _amount;
            }
        }
    }

    function withdrawAllFailedCredits() external {
        uint256 amount = failedTransferCredits[msg.sender];

        require(amount != 0, "no credits to withdraw");

        failedTransferCredits[msg.sender] = 0;

        (bool successfulWithdraw, ) = msg.sender.call{
            value: amount,
            gas: 20000
        }("");
        require(successfulWithdraw, "withdraw failed.");
    }

    function _transferNft(address _nftContractAddress, uint256 _nftTokenId, address _receiver) internal returns (bool) {
        IERC721(_nftContractAddress).transferFrom(address(this), _receiver, _nftTokenId);
        return true;
    }
 
}
