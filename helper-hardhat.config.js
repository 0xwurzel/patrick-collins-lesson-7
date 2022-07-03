const networkConfig = {
    4: {
        name: "rinkeby",
        ethUsdPriceFeedAddress: "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e",
    },
}

const developmentChains = ["hardhat", "localhost"]
const DECIMALS = 8
const INITIAL_ANSWER = 200000000000 // 2000 + DECIMALS zeroes

module.exports = { networkConfig, developmentChains, DECIMALS, INITIAL_ANSWER }
