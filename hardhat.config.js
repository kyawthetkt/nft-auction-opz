require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("@nomiclabs/hardhat-ethers");

const ETHER_SCAN_APIKEY = "WQRP6NI6ME3WVW6RUH8M523GA4J47U3CUG";
const COINMARKET_CAP_KEY = "";//"fd0c7a22-cb98-45fd-a975-74680e5c0855";
const INFURAIO_URL = "https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161";
const RINKEBY_PRIVATE_KEY = "f0c589753a58eadcda25fc76a741e95ea2cfc02561a38d96fc7a9a41c8d9a8b3";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 500,
      },
    },
  },
  etherscan: {
    apiKey: ETHER_SCAN_APIKEY
  },
  networks: {
    rinkeby: {
      url: INFURAIO_URL,
      accounts: [`0x${RINKEBY_PRIVATE_KEY}`],
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
    gasPrice: 21,
    coinmarketcap: COINMARKET_CAP_KEY,
  },
};
