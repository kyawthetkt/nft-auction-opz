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

let passedAuctionResult;
let auctionDetail;

function addMinuteToCurrent(minutesToAdd) {
    var currentDate = new Date();
    var futureTimestamp = currentDate.getTime() + minutesToAdd*60000;
    // console.log(futureTimestamp)
    // new Date(futureTimestamp);
    return futureTimestamp;
}

let endAuctionDate = addMinuteToCurrent(5);

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

  /******************************/
  /******* NFT Minting **********/
  /******************************/
  describe("Check NFT Owner", async function(){

    it("Should allow if user1 is NFT owner", async function () {
      expect(await nft.ownerOf(nftTokenId)).to.equal(user1.address);
    });

    it("Should allow if user2 is not NFT owner", async function () {
      expect(await nft.ownerOf(nftTokenId)).not.equal(user2.address);
    });   

  });

  /******************************/
  /********* Auction ************/
  /******************************/
    describe("Failed Auction Creation", async function(){

      it("Should reject if NFT contract address is invalid.", async function () {
        await expect(marketplace.connect(user1).createAuction(user1.address, nftTokenId, minPrice, endAuctionDate, 10)).to.be.revertedWith(
          "Invalid NFT Collection Contract address."
        );
      });

      it("Should reject if auction creator is not the owner.", async function () {
          await expect(marketplace.connect(user2).createAuction(nft.address, nftTokenId, minPrice, endAuctionDate, 10)).to.be.revertedWith(
            "Only NFT owner create."
          );
      });

      it("Should reject if auction end date is invalid.", async function () {
        let invalidEndate = 12222222;
        await expect(marketplace.connect(user2).createAuction(nft.address, nftTokenId, minPrice, invalidEndate, 10)).to.be.revertedWith(
          "Invalid auction end date."
        );
    });
  
    });
    
    describe("Passed Auction Creation", async function(){

      beforeEach(async () => {
        await marketplace.connect(user1).createAuction(nft.address, nftTokenId, minPrice, endAuctionDate,10);
        passedAuctionResult = await marketplace.nftAuctions(nft.address, nftTokenId);
      });

      it("Should allow if user1 is the seller.", async function () {
        expect(passedAuctionResult.seller).to.equal(user1.address);
      });

      it("Should allow if min price is equal.", async function () {
        expect(passedAuctionResult.minPrice).to.equal(minPrice);
      });

      it("Should allow if user1 transfers NFT ownership to marketplace.", async function () {
        expect(await nft.ownerOf(nftTokenId)).not.equal(user1.address);
      });
      
      it("Should allow if auction NFT is locked by marketplace.", async function () {
        expect(await nft.ownerOf(nftTokenId)).to.equal(marketplace.address);
      });

      // it("Should allow if auction status is true.", async function () {
      //    expect(passedAuctionResult.status).to.true;
      // });
  
    });
  /******************************/
  /*********** Bid **************/
  /******************************/
  describe("Create Bid", async function () {
      beforeEach(async () => {
          // Allow marketplace contract to transfer token of USER1
          // await PaymentToken.connect(USER1).approve(marketplace.address, 10000)
          // credit USER1 balance with tokens
          // await PaymentToken.transfer(USER1.address, 10000);
          await marketplace.connect(user1).createAuction(nft.address, nftTokenId, minPrice, endAuctionDate, 10);
          //approve smart contract to transfer this NFT
          // await nft.connect(user1).transferFrom(user1.address, marketplace.address, nftTokenId);
      });
      
      // Failed Bid
      it('Should reject if auction owner creates bid', async () => {        
        await expect(marketplace.connect(user1).createBid(nft.address, nftTokenId, 100)).to.be.revertedWith(
          "Owner cannot create bid."
        ); 
      });

      it('Should reject if new amount is not greater than current bid or min price', async () => {
        await expect(marketplace.connect(user2).createBid(nft.address, nftTokenId, 100)).to.be.revertedWith(
          "New bid must be higher than current bid."
        );
      });
  });

  describe("Get Auction", async function () {
    beforeEach(async () => {
        await marketplace.connect(user1).createAuction(nft.address, nftTokenId, minPrice, endAuctionDate, 10);
        auctionDetail = await marketplace.nftAuctions(nft.address, nftTokenId);
      });

    it('Check Seller Address', async () => {
      expect(auctionDetail.seller).to.equal(user1.address);
    });
    // it('Check Status', async () => {
    //   expect(auctionDetail.status).to.equal(true);        
    // });

    it('Check Minimun Price', async () => {
      expect(auctionDetail.minPrice).to.equal(100);        
    });

    it('Check Highest Bid', async () => {
      expect(auctionDetail.highestBid).to.equal(100);
    });

    it('Check Bid Increment Amount', async () => {
      expect(auctionDetail.bidIncrementAmount).to.equal(10);        
    });

  });

  describe("Settle Auction", async function () {
    beforeEach(async () => {
      await marketplace.connect(user1).createAuction(nft.address, nftTokenId, minPrice, endAuctionDate, 10);
      await marketplace.connect(user2).createBid(nft.address, nftTokenId, 200);
      await marketplace.connect(user3).createBid(nft.address, nftTokenId, 300);
    });
    
    // Failed Settlement
    it('Should reject if NFT Token id is invalid', async () => {
      const nonExistingNo = 222;
      await expect(marketplace.connect(user3).settleAuction(nft.address, nonExistingNo)).to.be.revertedWith(
        "Invalid NFT Auction."
      );
    });
      
    it('Should reject for non highest bidder claims NFT', async () => {
      await expect(marketplace.connect(user2).settleAuction(nft.address, nftTokenId)).to.be.revertedWith(
        "Only Highest can claim."
      );
    });

    // Passed Settlement
   it('Should allow if owner of NFT is user3 after claiming.', async () => {
        auctionDetail = await marketplace.nftAuctions(nft.address, nftTokenId);
        console.log("Before AuctionDetail: ", auctionDetail);

        await marketplace.connect(user3).settleAuction(nft.address, nftTokenId);
        expect(await nft.ownerOf(nftTokenId)).to.equal(user3.address);
        
        auctionDetail = await marketplace.nftAuctions(nft.address, nftTokenId);
        console.log("After AuctionDetail: ", auctionDetail);
    });
  });

});
