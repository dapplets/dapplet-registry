const { use, expect } = require("chai");
const { ethers } = require("hardhat");
const assertArrays = require("chai-arrays");
use(assertArrays);

describe("DappletRegistry", function () {
  let contract;
  let accountAddress;

  beforeEach(async function() {
    const [acc1] = await ethers.getSigners();

    const DappletRegistry = await ethers.getContractFactory("DappletRegistry");
    const deploy = await DappletRegistry.deploy();
    await deploy.deployed();

    accountAddress = acc1.address;
    contract = deploy;
  });

  it("The contract is being deposited", async function () {
    expect(contract.address).to.be.properAddress
  });

  it("should return modules by contextId", async () => {
    const moduleInfo = await contract.getModuleInfo(
      "twitter.com",
      [accountAddress],
      0,
    );
    expect(moduleInfo).to.be.equalTo([]);
  });

  it("should add virtual adapter and return features", async () => {
    // add adapter
    await contract.addModuleInfo(
      ["instagram.com"],
      {
        moduleType: 2, // adapter
        name: "instagram-adapter-test",
        title: "instagram-adapter-test",
        description: "instagram-adapter-test",
        owner: accountAddress,
        interfaces: ["identity-adapter-test"],
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

    // add adapter
    await contract.addModuleInfo(
      ["twitter.com"],
      {
        moduleType: 2, // adapter
        name: "twitter-adapter-test",
        title: "twitter-adapter-test",
        description: "twitter-adapter-test",
        owner: accountAddress,
        interfaces: ["identity-adapter-test"],
        icon: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
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
            hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
            uris: [
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            ],
          },
          dependencies: [],
          interfaces: [],
        },
      ],
    );

    //add feature
    await contract.addModuleInfo(
      ["identity-adapter-test"],
      {
        moduleType: 1, // feature
        name: "identity-feature-test",
        title: "identity-feature-test",
        description: "identity-feature-test",
        owner: accountAddress,
        interfaces: [],
        icon: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
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
            hash: "0x0000000000000000000000000000000000000000000000000000000000000003",
            uris: [
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            ],
          },
          dependencies: [],
          interfaces: [],
        },
      ],
    );

    const moduleByTwitter = await contract.getModuleInfo(
      "twitter.com",
      [accountAddress],
      0,
    );
    const moduleByInstagram = await contract.getModuleInfo(
      "instagram.com",
      [accountAddress],
      0,
    );

    const resultDataByTwitter = moduleByTwitter.map(getValues);
    const resultDataByInstagram = moduleByInstagram.map(getValues);

    expect(resultDataByTwitter).to.have.deep.members([
      {
        name: "twitter-adapter-test",
        title: "twitter-adapter-test",
        description: "twitter-adapter-test",
      },
      {
        name: "identity-feature-test",
        title: "identity-feature-test",
        description: "identity-feature-test",
      },
    ]);

    expect(resultDataByInstagram).to.have.deep.members([
      {
        name: "instagram-adapter-test",
        title: "instagram-adapter-test",
        description: "instagram-adapter-test",
      },
      {
        name: "identity-feature-test",
        title: "identity-feature-test",
        description: "identity-feature-test",
      },
    ]);
  });


  it("should added Context Id", async () => {
    // add adapter
    await contract.addModuleInfo(
      [],
      {
        moduleType: 2, // adapter
        name: "instagram-adapter-test",
        title: "instagram-adapter-test",
        description: "instagram-adapter-test",
        owner: accountAddress,
        interfaces: ["identity-adapter-test"],
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

    await contract.addContextId("instagram-adapter-test", "yandex.ru");

    const moduleByContext = await contract.getModuleInfo(
      "yandex.ru",
      [accountAddress],
      0,
    );

    const resultModuleById = moduleByContext.map(getValues);

    expect(resultModuleById).to.have.deep.members([
      {
        name: "instagram-adapter-test",
        title: "instagram-adapter-test",
        description: "instagram-adapter-test",
      }
    ]);
  });

  it("should remove Context Id", async () => {
    // add adapter
    await contract.addModuleInfo(
      [],
      {
        moduleType: 2, // adapter
        name: "instagram-adapter-test",
        title: "instagram-adapter-test",
        description: "instagram-adapter-test",
        owner: accountAddress,
        interfaces: ["identity-adapter-test"],
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

    await contract.addContextId("instagram-adapter-test", "yandex.ru");
    await contract.removeContextId("instagram-adapter-test", "yandex.ru");
    const moduleInfo = await contract.getModuleInfo(
      "yandex.ru",
      [accountAddress],
      0,
    );

    expect(moduleInfo).to.be.equalTo([]);
  });
});

const getValues = (data) => {
  return {
      name: data.name,
      title: data.title,
      description: data.description,
  }
};
