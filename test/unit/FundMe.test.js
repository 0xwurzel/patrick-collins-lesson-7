const { inputToConfig } = require("@ethereum-waffle/compiler")
const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts } = require("hardhat")

describe("FundMe", async function () {
    let fundMe
    let deployer
    let mockV3Aggregator
    const sendValue = ethers.utils.parseEther("1")
    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture("all")
        fundMe = await ethers.getContract("FundMe", deployer)
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer
        )
    })

    describe("constructor", async function () {
        it("sets the aggregator addresses correctly", async function () {
            const response = await fundMe.priceFeed()
            assert.equal(response, mockV3Aggregator.address)
        })
        it("sets owner correctly", async function () {
            const response = await fundMe.i_owner()
            assert.equal(response, deployer)
        })
    })

    describe("fund", async function () {
        it("fails if insuffient eth sent", async function () {
            await expect(fundMe.fund()).to.be.revertedWith(
                "You need to spend more ETH!"
            )
        })
        it("updates addressToAmountFunded correctly", async function () {
            const beforeValue = await fundMe.addressToAmountFunded(deployer)
            await assert.equal(beforeValue.toString(), 0)

            await fundMe.fund({ value: sendValue })
            const afterValue = await fundMe.addressToAmountFunded(deployer)
            await assert.equal(afterValue.toString(), sendValue.toString())
        })
        it("adds funder to array of funders", async function () {
            await fundMe.fund({ value: sendValue })
            await assert.equal(await fundMe.funders(0), deployer)
        })
    })

    describe("withdraw", async function () {
        beforeEach(async function () {
            await fundMe.fund({ value: sendValue })
        })
        it("can withdraw eth from a single funder", async function () {
            //arrange
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )
            console.log(
                `startingFundMeBalance:${startingFundMeBalance.toString()}`
            )
            console.log(
                `startingDeployerBalance:${startingDeployerBalance.toString()}`
            )

            //act
            const response = await fundMe.withdraw()
            const result = await response.wait(1)

            //assert
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )
            console.log(`endingFundMeBalance:${endingFundMeBalance.toString()}`)
            console.log(
                `endingDeployerBalance:${endingDeployerBalance.toString()}`
            )
            console.log(
                `gas used:${
                    result.cumulativeGasUsed * result.effectiveGasPrice
                }`
            )
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance
                    .add(result.gasUsed.mul(result.effectiveGasPrice))
                    .toString()
            )
        })
        it("allows us to withdraw with multiple funders", async function () {
            // Arrange
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )
            const accounts = await ethers.getSigners()
            const numFunders = 5
            for (let i = 0; i < numFunders; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i + 1]
                )
                fundMeConnectedContract.fund({ value: sendValue })
            }

            // Act
            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            // Assert
            assert.equal(
                startingFundMeBalance
                    .add(startingDeployerBalance)
                    .add(sendValue.mul(numFunders))
                    .toString(),
                endingDeployerBalance
                    .add(gasUsed.mul(effectiveGasPrice))
                    .toString()
            )

            // make sure funders reset to zero
            await expect(fundMe.funders(0)).to.be.reverted
            for (let i = 0; i < numFunders; i++) {
                assert.equal(
                    await fundMe.addressToAmountFunded(accounts[i].address),
                    0
                )
            }
        })
        it("only allows owner to withdraw", async function () {
            // Arrange
            const accounts = await ethers.getSigners()
            const fundMeConnectedContract = await fundMe.connect(accounts[1])
            // Act
            // Assert
            await expect(fundMeConnectedContract.withdraw()).to.be.revertedWith(
                "FundMe__NotOwner"
            )
        })
    })
})
