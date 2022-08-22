const { use, expect } = require("chai");
require("dotenv").config({ path: __dirname + "/.env" });
const { ethers } = require("hardhat");
const assertArrays = require("chai-arrays");
const chaiAsPromised = require("chai-as-promised");
const addModuleInfo = require("../helpers/addModuleInfo");
use(assertArrays);
use(chaiAsPromised);

const isOnlyInfiniteTest = process.argv.includes(
  "test/z-dappletRegistry-infinity.js",
);

describe("DappletRegistry Infinity Test", function () {
  let contract;
  let accountAddress;

  beforeEach(async function () {
    const [acc1] = await ethers.getSigners();
    accountAddress = acc1.address;

    const DappletNFT = await ethers.getContractFactory("DappletNFT", acc1);
    const LibRegistryRead = await ethers.getContractFactory(
      "LibDappletRegistryRead",
      acc1,
    );
    const deployDappletNFT = await DappletNFT.deploy();
    const libRegistryRead = await LibRegistryRead.deploy();

    await deployDappletNFT.deployed();
    await libRegistryRead.deployed();

    const DappletRegistry = await ethers.getContractFactory("DappletRegistry", {
      signer: acc1,
      libraries: {
        LibDappletRegistryRead: libRegistryRead.address,
      },
    });
    const deployDappletRegistry = await DappletRegistry.deploy(
      deployDappletNFT.address,
    );
    await deployDappletRegistry.deployed();
    contract = deployDappletRegistry;

    await deployDappletNFT.transferOwnership(contract.address);
  });

  // Get Modules INFINITY
  it("getModules pagination", async function () {
    if (!isOnlyInfiniteTest) this.skip();

    console.log("\x1b[41m%s\x1b[0m", "WARNING: This test infinity");

    for (let j = 0; j < 100; j++) {
      for (let i = 0; i < 100; i++) {
        await addModuleInfo(contract, {
          accountAddress,
          name: `twitter-adapter-test-${j}-${i}`,
        });
        console.log(`Added ${j * 100 + i + 1} modules`);
      }

      const result = await contract.getModules("default", j * 100, 100);
      console.log(
        { result },
        "result",
        result["result"].length,
        result["nextOffset"],
        result["total"],
        result["result"][result["result"].length - 1].name,
      );
    }
  });
});
