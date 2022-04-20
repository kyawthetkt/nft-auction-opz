const { expect } = require("chai");
const { ethers } = require("hardhat");

const nftTokenId = 1;

let NftContract;
let nft;
let MarketplaceContract;
let marketplace;

let user1;
let user2;
let minPrice = 100;

describe("Nft", function () {
  
  // First Step Deployment Testing.
  beforeEach(async function () {

      // Deploy ERC-721
      NftContract = await ethers.getContractFactory("Nft");
      nft = await NftContract.deploy("TEST", "TST");
      await nft.deployed();

      [ContractOwner, user1, user2, user3, testArtist, testPlatform] = await ethers.getSigners();
      await nft.mintNft(user1.address, "test.nft.uri");

      // Deploy Marketplace
      MarketplaceContract = await ethers.getContractFactory("Marketplace");
      marketplace = await MarketplaceContract.deploy("KT Market");
      await marketplace.deployed();

      await nft.connect(user1).approve(marketplace.address, nftTokenId);
      
      
  });

  describe("Deployment and Auction Creation", async function(){
    it("Deploy to mint NFT token and check token owner", async function () {
      expect(await nft.ownerOf(nftTokenId)).to.equal(user1.address);
    });

    it("Create Auction", async function () {
      await marketplace.connect(user1).createAuction(nft.address, nftTokenId, 1, minPrice, 10);
      let result = await marketplace.nftAuctions(nft.address, nftTokenId);
      expect(result.seller).to.equal(user1.address);
    });
  });

  describe("Create Bid", async function () {
      beforeEach(async () => {
          // Allow marketplace contract to transfer token of USER1
          // await PaymentToken.connect(USER1).approve(marketplace.address, 10000)
          // credit USER1 balance with tokens
          // await PaymentToken.transfer(USER1.address, 10000);
          await marketplace.connect(user1).createAuction(nft.address, nftTokenId, 1, minPrice, 10);
          //approve smart contract to transfer this NFT
          // await nft.connect(user1).transferFrom(user1.address, marketplace.address, nftTokenId);
      });
      // it("transferring nft token directly to contract", async function () {
      //   await nft.connect(user1).transferFrom(user1.address, marketplace.address, nftTokenId);
      //   expect(await nft.ownerOf(nftTokenId)).to.equal(marketplace.address);
      // });

    /*  it('Should not allow new Bid if auction owner creates bid', async () => {
        await expect(marketplace.connect(user1).createBid(nft.address, nftTokenId, 101)).to.be.revertedWith(
          "Owner cannot create bid"
        );
      });

      it('Should not allow new Bid if new bid amount is not higher than current bid or min price', async () => {
        await expect(marketplace.connect(user2).createBid(nft.address, nftTokenId, 100)).to.be.revertedWith(
          "New bid must be higher than current bid."
        );
      }) */
      
      /*
      * Claim NFT
      */
      it('Should not allow NFT claim for invalid contract address and token id', async () => {
        await expect(marketplace.connect(user2).claimNft(nft.address, 2322)).to.be.revertedWith(
          "Invalid NFT Auction."
        );
      });
      
      it('Should not allow NFT claim for non highest bidder', async () => {
        await marketplace.connect(user2).createBid(nft.address, nftTokenId, 101);
        await marketplace.connect(user3).createBid(nft.address, nftTokenId, 120);
        await expect(marketplace.connect(user2).claimNft(nft.address, nftTokenId)).to.be.revertedWith(
          "Only Highest can claim."
        );
      });

      it('Check after claiming NFT.', async () => {
          await marketplace.connect(user2).createBid(nft.address, nftTokenId, 300);
          await marketplace.connect(user2).claimNft(nft.address, nftTokenId);
          expect(await nft.ownerOf(nftTokenId)).to.equal(user2.address);
      });

      it('Check if an auction has highest bid', async () => {
        await marketplace.connect(user2).createBid(nft.address, nftTokenId, 101);
        let result1 = await marketplace.nftAuctions(nft.address, nftTokenId);
        expect(result1.highestBidder).to.equal(user2.address)
        await marketplace.connect(user3).createBid(nft.address, nftTokenId, 102);
        let result2 = await marketplace.nftAuctions(nft.address, nftTokenId);
        expect(result2.highestBidder).to.equal(user3.address)
      });

      it('Check bid detail', async () => {
        const bidPrice = 101;
        await marketplace.connect(user2).createBid(nft.address, nftTokenId, bidPrice);
        const res = await marketplace.getAuction(nft.address, nftTokenId);
        expect(bidPrice).to.equal(res.highestBid)
        expect(minPrice).to.equal(res.minPrice)
      }); 

  });  

});
