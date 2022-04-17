const { expect } = require("chai");
const { ethers } = require("hardhat");

const nftTokenId = 1;

let NftContract;
let nft;
let MarketplaceContract;
let marketplace;

let user1;
let user2;

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

      //approve smart contract to transfer this NFT
      await nft.connect(user1).approve(marketplace.address, nftTokenId);
      
  });

  describe("Deployment and Auction Creation", async function(){
    it("Deploy to mint NFT token and check token owner", async function () {
      expect(await nft.ownerOf(nftTokenId)).to.equal(user1.address);
    });

    it("Create Auction", async function () {
      await marketplace.connect(user1).createAuction(nft.address, nftTokenId, 1, 100, 10);
      let result = await marketplace.nftAuctions(nft.address, nftTokenId);
      expect(result.seller).to.equal(user1.address);
    });
  });

  describe("Create Bid", async function () {
      beforeEach(async () => {
          // Allow marketplace contract to transfer token of USER1
          // await PaymentToken.connect(USER1).approve(marketplace.address, 10000)
          // credit USER1 balance with tokens
          // await PaymentToken.transfer(USER1.address, 10000)
          // Place new bid with USER1          
          await marketplace.connect(user1).createAuction(nft.address, nftTokenId, 1, 100, 10);
      });

      it('Should reject new Bid if auction owner creates bid', async () => {
        await expect(marketplace.connect(user1).createBid(nft.address, nftTokenId, 101)).to.be.revertedWith(
          "Owner cannot create bid"
        );
      });

      it('Should reject new Bid if new bid amount is not higher than current bid or min price', async () => {
        await expect(marketplace.connect(user2).createBid(nft.address, nftTokenId, 100)).to.be.revertedWith(
          "New bid must be higher than current bid."
        );
      })

      // it('Accept new Bid if auction owner creates bid', async () => {
      //   await marketplace.connect(user2).createBid(nft.address, nftTokenId, 101);
      //   let result1 = await marketplace.nftAuctions(nft.address, nftTokenId);
      //   console.log(result1.highestBidder)
      //   await marketplace.connect(user3).createBid(nft.address, nftTokenId, 102);
      //   let result = await marketplace.nftAuctions(nft.address, nftTokenId);
      //   console.log(result.highestBidder)
      // });

  });  

});
