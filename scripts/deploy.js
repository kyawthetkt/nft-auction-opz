// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString())

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const NftContract = await ethers.getContractFactory("Nft");

  const marketplace = await Marketplace.deploy('My NFT Marketplace');
  const nftContract = await NftContract.deploy("KT Token", "KT");

  console.log("NFT deployed to: ", nftContract.address);
  console.log("Marketplace deployed to:", marketplace.address);
}

/*

 
  
   ;
  
    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.deploy('My NFT Marketplace');
    console.log("Marketplace address:", marketplace.address);

    const NFTCollection = await ethers.getContractFactory("NFTCollection");
    const nftCollection = await NFTCollection.deploy();
    console.log("NFT Collection address:", nftCollection.address);

    const ERC20 = await ethers.getContractFactory("ERC20");
    const erc20 = await ERC20.deploy(600000, 'POC1 Token', 'POC1-Token');
    // const erc20 = await ERC20.deploy(1000000, 'Ether Token', 'ETH');
    console.log("ERC20 Token address:", erc20.address);
  }

*/

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
