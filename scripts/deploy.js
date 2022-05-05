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

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const ERC721Contract = await ethers.getContractFactory("ERC721Contract");

  const marketplace = await Marketplace.deploy('CVL NFT Marketplace');
  const nftContract = await ERC721Contract.deploy("CVL", "CVL");

  console.log("DEPLOYING CONTRACTS WITH THE ACCOUNT: ", deployer.address);
  console.log("ACCOUNT BALANCE: ", (await deployer.getBalance()).toString());
  console.log("ERC721 DEPLOYED TO: ", nftContract.address);
  console.log("MARKETPLACE DEPLOYED TO: ", marketplace.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
