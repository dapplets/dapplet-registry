const { use, expect } = require("chai");
const { ethers } = require("hardhat");
const assertArrays = require("chai-arrays");
const chaiAsPromised = require("chai-as-promised");
use(assertArrays);
use(chaiAsPromised);

describe("DappletRegistry", function () {
  let contract;
  let accountAddress;

  beforeEach(async function () {
    const [acc1] = await ethers.getSigners();
    accountAddress = acc1.address;

    const DappletNFT = await ethers.getContractFactory("DappletNFT", acc1);
    const deployDappletNFT = await DappletNFT.deploy();
    await deployDappletNFT.deployed();

    const DappletRegistry = await ethers.getContractFactory(
      "DappletRegistry",
      acc1,
    );
    const deployDappletRegistry = await DappletRegistry.deploy(
      deployDappletNFT.address,
    );

    await deployDappletRegistry.deployed();
    contract = deployDappletRegistry;

    await deployDappletNFT.transferOwnership(contract.address);
  });

  // Get Modules INFINITY
  it("getModules pagination", async () => {
    console.log("\x1b[41m%s\x1b[0m", "WARNING: This test infinity");

    for (let j = 0; j < 100; j++) {
      for (let i = 0; i < 100; i++) {
        await addModuleInfo(contract, {
          accountAddress,
          name: `twitter-adapter-test-${j}-${i}`,
        });
        console.log(`Added ${j * 100 + i + 1} modules`);
      }

      const result = await contract.getModules(j * 100, 100);
      console.log(
        "result",
        result["result"].length,
        result["nextOffset"],
        result["totalModules"],
        result["result"][result["result"].length - 1].name,
      );
    }
  });
});

/**
 *
 * @param {*} contract
 * @param {
 *  Object
 *  @param {title} title
 *  @param {description} description
 *  @param {name} name
 *  @param {accountAddress}
 *   accountAddress the address of the module creator. Only he can get all the models at
 *  @param {context} context array of contexts where the module can work
 *  @param {interfaces} interfaces ??
 *  @param {moduleType} moduleType number
 *
 * }
 */
const addModuleInfo = async (
  contract,
  {
    title = "twitter-adapter-test",
    description = "twitter-adapter-test",
    name = "twitter-adapter-test",
    accountAddress,
    context = ["twitter.com"],
    interfaces = ["identity-adapter-test"],
    moduleType = 2,
  },
) => {
  await contract.addModuleInfo(
    context,
    {
      moduleType, // adapter
      name,
      title,
      description,
      fullDescription: {
        hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        uris: [
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ],
      },
      owner: accountAddress,
      interfaces,
      icon: {
        hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        uris: [
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ],
      },
      flags: 0,
    },
    [
      {
        branch: "default",
        major: 0,
        minor: 0,
        patch: 1,
        flags: 0,
        binary: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          uris: [
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          ],
        },
        dependencies: [],
        interfaces: [],
      },
    ],
  );
};
