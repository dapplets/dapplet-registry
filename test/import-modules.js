const { use, expect } = require("chai");
const { ethers } = require("hardhat");
const assertArrays = require("chai-arrays");
const chaiAsPromised = require("chai-as-promised");
const { importModules } = require("../helpers/import");

use(assertArrays);
use(chaiAsPromised);

describe("DappletRegistry", function () {
    let contract;
    let nftContract;
    let accountAddress;

    it("should deploy contracts", async () => {
        const [acc1] = await ethers.getSigners();
        accountAddress = acc1.address;

        const DappletNFT = await ethers.getContractFactory("DappletNFT", acc1);
        const LibRegistryRead = await ethers.getContractFactory(
            "LibDappletRegistryRead",
            acc1
        );
        const deployDappletNFT = await DappletNFT.deploy();
        const libRegistryRead = await LibRegistryRead.deploy();

        await deployDappletNFT.deployed();
        await libRegistryRead.deployed();

        const DappletRegistry = await ethers.getContractFactory(
            "DappletRegistry",
            {
                signer: acc1,
                libraries: {
                    LibDappletRegistryRead: libRegistryRead.address,
                },
            }
        );
        const deployDappletRegistry = await DappletRegistry.deploy(
            deployDappletNFT.address,
            ZERO_ADDRESS
        );
        await deployDappletRegistry.deployed();
        contract = deployDappletRegistry;

        await deployDappletNFT.transferOwnership(contract.address);

        nftContract = deployDappletNFT;
    });

    it("should import modules from json", async () => {
        const { modules } = await importModules(contract);
        const { total } = await contract.getModules("default", 0, 0, false);

        expect(total.toNumber()).to.deep.equal(modules.length);
    });

    it("should get modules by context ids", async () => {
        const { modules, owners } = await contract.getModulesInfoByListersBatch(
            ["twitter.com"],
            [accountAddress],
            0
        );

        expect(modules.length).eq(1);
        expect(owners.length).eq(1);
        expect(modules.length).eq(owners.length);
        expect(modules[0].length).gt(0);
    });

    it("should add module to third party listing", async () => {
        const [, lister] = await ethers.getSigners();
        const _contract = await contract.connect(lister);
        await _contract.changeMyListing([
            ["H", "tweery"],
            ["tweery", "T"]
        ]);

        const { modules, owners } = await contract.getModulesInfoByListersBatch(
            ["twitter.com"],
            [lister.address],
            0
        );

        expect(modules.length).eq(1);
        expect(owners.length).eq(1);
        expect(modules.length).eq(owners.length);
        expect(modules[0].length).gt(0);
    });
});
