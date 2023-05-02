const { use, expect } = require("chai");
const { ethers } = require("hardhat");
const assertArrays = require("chai-arrays");
const chaiAsPromised = require("chai-as-promised");
use(assertArrays);
use(chaiAsPromised);

describe("DappletNFT", function () {
    let dappletContract;
    let buyerAddress;

    beforeEach(async function () {
        const [acc1, acc2] = await ethers.getSigners();
        buyerAddress = acc2.address;

        const DappletNFT = await ethers.getContractFactory("DappletNFT", acc1);
        const deployDappletNFT = await DappletNFT.deploy();
        await deployDappletNFT.deployed();
        dappletContract = deployDappletNFT;
    });

    it("The contract is being deposited", async () => {
        expect(dappletContract.address).to.be.properAddress;
    });

    it("The dapplet NFT has been mined", async () => {
        await dappletContract.safeMint(buyerAddress, 737);
        const tokenOwner = await dappletContract.ownerOf(737);
        expect(tokenOwner).to.equal(buyerAddress);
    });
});
