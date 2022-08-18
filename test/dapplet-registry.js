const { use, expect } = require("chai");
const { ethers } = require("hardhat");
const assertArrays = require("chai-arrays");
const chaiAsPromised = require("chai-as-promised");
const addModuleInfo = require("../helpers/addModuleInfo");
const md5 = require("md5");
use(assertArrays);
use(chaiAsPromised);

const H = 0;
const T = 4294967295;

function prepareArguments(args) {
  return args;
}

const getValues = (data) => {
  return {
    name: data.name,
    title: data.title,
    description: data.description,
  };
};

const getVersion = (data) => {
  return {
    branch: data.branch,
    major: data.major,
    minor: data.minor,
    patch: data.patch,
    extensionVersion: data.extensionVersion,
  };
};

const addVersion = ({
  branch = "default",
  major = 9,
  minor = 8,
  patch = 7,
  extensionVersion = "0x00ff01",
}) => {
  return {
    branch,
    major,
    minor,
    patch,
    flags: 0,
    binary: {
      hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      uris: [
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      ],
    },
    dependencies: [],
    interfaces: [],
    extensionVersion,
  };
};

describe("DappletRegistry", function () {
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

  it("The contract is being deposited", async function () {
    expect(contract.address).to.be.properAddress;
  });

  it("should return zero modules by contextId", async () => {
    const moduleInfo = await contract.getModulesInfoByListers(
      "twitter.com",
      [accountAddress],
      0,
    );
    expect(moduleInfo).to.eql([[], []]);
  });

  it("should return modules by contextId after addModuleInfo and added it to listing ", async () => {
    // 1
    await addModuleInfo(contract, {
      moduleType: 2, // 2 - adapter
      context: ["instagram.com"],
      interfaces: ["identity-adapter-test"],
      description: "instagram-adapter-test",
      name: "instagram-adapter-test",
      title: "instagram-adapter-test",
    });

    // 2
    await addModuleInfo(contract, {});

    // 3
    await addModuleInfo(contract, {
      moduleType: 1, // 1 - dapplet
      context: ["identity-adapter-test"],
      interfaces: [],
      description: "identity-feature-test",
      name: "identity-feature-test",
      title: "identity-feature-test",
    });

    await contract.changeMyListing(
      [
        ["H", "identity-feature-test"],
        ["identity-feature-test", "T"],
      ],
    );

    const moduleByTwitter = await contract.getModulesInfoByListers(
      "twitter.com",
      [accountAddress],
      0,
    );
    const moduleByInstagram = await contract.getModulesInfoByListers(
      "instagram.com",
      [accountAddress],
      0,
    );

    const resultDataByTwitter = moduleByTwitter.modulesInfo.map(getValues);
    const resultDataByInstagram = moduleByInstagram.modulesInfo.map(getValues);

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

  it("should add and remove Context Id", async () => {
    await addModuleInfo(contract, { accountAddress });

    await contract.changeMyListing(
      [
        ["H", "twitter-adapter-test"],
        ["twitter-adapter-test", "T"],
      ],
    );

    await contract.addContextId("twitter-adapter-test", "yahoo.com");

    const moduleByContext = await contract.getModulesInfoByListers(
      "yahoo.com",
      [accountAddress],
      0,
    );

    const resultModuleById = moduleByContext.modulesInfo.map(getValues);
    expect(resultModuleById).to.eql([
      {
        name: "twitter-adapter-test",
        title: "twitter-adapter-test",
        description: "twitter-adapter-test",
      },
    ]);

    await contract.removeContextId("twitter-adapter-test", "yahoo.com");

    const moduleInfo = await contract.getModulesInfoByListers(
      "yahoo.com",
      [accountAddress],
      0,
    );

    expect(moduleInfo.modulesInfo).to.eql([]);
  });

  it("only the Owner can add the ContextID", async () => {
    const [_, acc2] = await ethers.getSigners();
    await addModuleInfo(contract, { accountAddress });
    await contract.changeMyListing(
      [
        ["H", "twitter-adapter-test"],
        ["twitter-adapter-test", "T"],
      ],
    );
    const differentAccount = await contract.connect(acc2);
    const error = differentAccount.addContextId(
      "twitter-adapter-test",
      "yahoo.com",
    );

    return expect(error).to.eventually.be.rejected.and.be.an.instanceOf(Error);
  });

  it("only the Owner can remove the ContextID", async () => {
    const [_, acc2] = await ethers.getSigners();
    await addModuleInfo(contract, { accountAddress });
    await contract.changeMyListing(
      [
        ["H", "twitter-adapter-test"],
        ["twitter-adapter-test", "T"],
      ],
    );
    await contract.addContextId("twitter-adapter-test", "yahoo.com");

    const differentAccount = await contract.connect(acc2);
    const error = differentAccount.removeContextId(
      "twitter-adapter-test",
      "yahoo.com",
    );

    return expect(error).to.eventually.be.rejected.and.be.an.instanceOf(Error);
  });

  it("empty array of modules when received from another address", async () => {
    const [_, acc2] = await ethers.getSigners();

    await addModuleInfo(contract, {});

    const moduleInfo = await contract.getModulesInfoByListers(
      "twitter.com",
      [acc2.address],
      0,
    );

    expect(moduleInfo.modulesInfo).to.be.equalTo([]);
  });

  it("should return information on the added module", async () => {
    await addModuleInfo(contract, {});

    const moduleInfoByName = await contract.getModuleInfoByName(
      "twitter-adapter-test",
    );
    const modulesInfoByOwner = await contract.getModulesInfoByOwner(
      accountAddress,
      0,
      10,
    );
    const resultByName = getValues(moduleInfoByName.modulesInfo);
    const resultByOwner = modulesInfoByOwner.modulesInfo.map(getValues);

    expect(resultByName).to.eql({
      name: "twitter-adapter-test",
      title: "twitter-adapter-test",
      description: "twitter-adapter-test",
    });
    expect(resultByOwner).to.eql([
      {
        name: "twitter-adapter-test",
        title: "twitter-adapter-test",
        description: "twitter-adapter-test",
      },
    ]);
  });

  it("should edit title and description module", async () => {
    await addModuleInfo(contract, {});

    await contract.editModuleInfo(
      "twitter-adapter-test",
      "twitter-adapter-title",
      "twitter-adapter-description",
      {
        hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
        uris: [
          "0x0000000000000000000000000000000000000000000000000000000000000003",
        ],
      },
      {
        hash: "0x0000000000000000000000000000000000000000000000000000000000000004",
        uris: [
          "0x0000000000000000000000000000000000000000000000000000000000000005",
        ],
      },
    );

    const moduleInfo = await contract.getModuleInfoByName(
      "twitter-adapter-test",
    );
    const resultByName = {
      name: moduleInfo.modulesInfo.name,
      title: moduleInfo.modulesInfo.title,
      description: moduleInfo.modulesInfo.description,
      fullDescription: {
        hash: moduleInfo.modulesInfo.fullDescription.hash,
        uris: moduleInfo.modulesInfo.fullDescription.uris,
      },
      icon: {
        hash: moduleInfo.modulesInfo.icon.hash,
        uris: moduleInfo.modulesInfo.icon.uris,
      },
    };

    expect(resultByName).to.eql({
      name: "twitter-adapter-test",
      title: "twitter-adapter-title",
      description: "twitter-adapter-description",
      fullDescription: {
        hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
        uris: [
          "0x0000000000000000000000000000000000000000000000000000000000000003",
        ],
      },
      icon: {
        hash: "0x0000000000000000000000000000000000000000000000000000000000000004",
        uris: [
          "0x0000000000000000000000000000000000000000000000000000000000000005",
        ],
      },
    });
  });

  it("should add a new version to the module", async () => {
    await addModuleInfo(contract, {});

    await contract.addModuleVersion(
      "twitter-adapter-test",
      addVersion({
        extensionVersion: "0x00f119",
      }),
    );

    const getVersionInfo = await contract.getVersionInfo(
      "twitter-adapter-test",
      "default",
      9,
      8,
      7,
    );

    const resultVersion = getVersionInfo.map(getVersion)[0];
    expect(resultVersion).to.eql({
      branch: "default",
      major: 9,
      minor: 8,
      patch: 7,
      extensionVersion: "0x00f119",
    });
  });

  it("should add a new batch version to the module", async () => {
    await addModuleInfo(contract, {
      interfaces: [],
    });
    await addModuleInfo(contract, {
      moduleType: 2,
      context: ["instagram.com"],
      interfaces: [],
      description: "instagram-adapter-test",
      name: "instagram-adapter-test",
      title: "instagram-adapter-test",
    });

    await contract.addModuleVersionBatch(
      ["twitter-adapter-test", "instagram-adapter-test"],
      [
        addVersion({
          branch: "default",
          major: 7,
          minor: 6,
          patch: 5,
        }),
        addVersion({
          branch: "master",
          major: 1,
          minor: 2,
          patch: 3,
        }),
      ],
    );

    await contract.changeMyListing(
      [
        ["H", "twitter-adapter-test"],
        ["twitter-adapter-test", "instagram-adapter-test"],
        ["instagram-adapter-test", "T"],
      ],
    );

    const modulesInfoByListersBatch =
      await contract.getModulesInfoByListersBatch(
        ["twitter.com", "instagram.com"],
        [accountAddress],
        1000,
      );
    
    const result = modulesInfoByListersBatch.modulesInfos.map((item) =>
      getValues(item[0]),
    );
    expect(result).to.eql([
      {
        name: "twitter-adapter-test",
        title: "twitter-adapter-test",
        description: "twitter-adapter-test",
      },
      {
        name: "instagram-adapter-test",
        title: "instagram-adapter-test",
        description: "instagram-adapter-test",
      },
    ]);
  });

  it("should create and delete admins for the module", async () => {
    const [_, acc2, acc3] = await ethers.getSigners();

    await addModuleInfo(contract, {});

    // Сreate
    await contract.addAdmin("twitter-adapter-test", acc2.address);
    await contract.addAdmin("twitter-adapter-test", acc3.address);

    const createAdmins = await contract.getAdminsByModule("twitter-adapter-test");
    expect(createAdmins).to.eql([acc2.address, acc3.address]);

    // Remove acc2 address
    await contract.removeAdmin("twitter-adapter-test", acc2.address);
    const removeAdmins = await contract.getAdminsByModule("twitter-adapter-test");
    expect(removeAdmins).to.eql([acc3.address]);
  });

  it("only the owner can add a new administrator", async () => {
    const [_, acc2] = await ethers.getSigners();

    await addModuleInfo(contract, {});
    const differentAccount = await contract.connect(acc2);

    const error = differentAccount.addAdmin(
      "twitter-adapter-test",
      acc2.address,
    );
    return expect(error).to.eventually.be.rejected.and.be.an.instanceOf(Error);
  });

  it("adding a new version with administrator rights", async () => {
    const [_, acc2] = await ethers.getSigners();

    await addModuleInfo(contract, {});
    await contract.addAdmin("twitter-adapter-test", acc2.address);

    const differentAccount = await contract.connect(acc2);
    await differentAccount.addModuleVersion(
      "twitter-adapter-test",
      addVersion({}),
    );

    const getVersionInfo = await contract.getVersionInfo(
      "twitter-adapter-test",
      "default",
      9,
      8,
      7,
    );
    const resultVersion = getVersionInfo.map(getVersion)[0];

    expect(resultVersion).to.eql({
      branch: "default",
      major: 9,
      minor: 8,
      patch: 7,
      extensionVersion: "0x00ff01",
    });
  });

  it("person without administrator rights cannot add a new version of the module", async () => {
    const [_, acc2] = await ethers.getSigners();
    await addModuleInfo(contract, {});

    const differentAccount = await contract.connect(acc2);

    const error = differentAccount.addModuleVersion(
      "twitter-adapter-test",
      addVersion({}),
    );

    return expect(error).to.eventually.be.rejected.and.be.an.instanceOf(Error);
  });

  it("should return context ids module by module name", async () => {
    await addModuleInfo(contract, {
      accountAddress,
      name: "adaplet-test",
      context: ["twitter.com", "google.com"],
    });

    await contract.addContextId("adaplet-test", "yahoo.com");

    const result = await contract.getContextIdsByModule("adaplet-test");
    expect(result).to.have.deep.members([
      "twitter.com",
      "google.com",
      "yahoo.com",
    ]);
  });

  it("should return 20 elements with arguments (0, 10) and (10, 10)", async () => {
    for (let i = 0; i < 20; i++) {
      await addModuleInfo(contract, {
        accountAddress,
        title: `twitter-adapter-test-${i}`,
        description: `twitter-adapter-test-${i}`,
        name: `twitter-adapter-test-${i}`,
        context: [],
        interfaces: [],
      });
    }

    const page_1 = await contract.getModules(0, 10);
    const page_2 = await contract.getModules(10, 10);
    expect([...page_1[0], ...page_2[0]]).to.be.length(20);
  });

  it("transmitting and verifying the addition of dynamically added data", async () => {
    const title = md5("title");
    const name = md5("name");
    const description = md5("description");
    const context = md5("context");

    await addModuleInfo(contract, {
      title,
      name,
      description,
      context: [context],
    });

    await contract.changeMyListing(
      [
        ["H", name],
        [name, "T"],
      ],
    );

    const moduleByContext = await contract.getModules(0, 1);

    const result = moduleByContext.modules.map(getValues);

    expect(result).to.eql([
      {
        name,
        title,
        description,
      },
    ]);
  });

  it("returns an array of branches", async () => {
    await addModuleInfo(contract, {});

    await contract.addModuleVersion(
      "twitter-adapter-test",
      addVersion({ branch: "default", major: 0, minor: 1, patch: 0 }),
    );

    await contract.addModuleVersion(
      "twitter-adapter-test",
      addVersion({ branch: "default", major: 0, minor: 1, patch: 1 }),
    );

    await contract.addModuleVersion(
      "twitter-adapter-test",
      addVersion({ branch: "new", major: 0, minor: 1, patch: 0 }),
    );

    await contract.addModuleVersion(
      "twitter-adapter-test",
      addVersion({ branch: "new", major: 0, minor: 1, patch: 1 }),
    );
    
    await contract.addModuleVersion(
      "twitter-adapter-test",
      addVersion({ branch: "legacy", major: 0, minor: 1, patch: 0 }),
    );

    await contract.addModuleVersion(
      "twitter-adapter-test",
      addVersion({ branch: "legacy", major: 0, minor: 1, patch: 1 }),
    );

    const branches = await contract.getBranchesByModule("twitter-adapter-test");
    expect(branches).to.deep.eq(["default", "new", "legacy"]);    
  });
});

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

describe("DappletRegistry + DappletNFT", function () {
  let registryContract;
  let dappletContract;
  let accountAddress;
  let dappletOwnerAddress;

  beforeEach(async function () {
    const [acc1, acc2] = await ethers.getSigners();
    accountAddress = acc1.address;
    dappletOwnerAddress = acc2.address;

    const LibDappletRegistryRead = await ethers.getContractFactory(
      "LibDappletRegistryRead",
      acc1,
    );
    const DappletNFT = await ethers.getContractFactory("DappletNFT", acc1);

    const deployDappletNFT = await DappletNFT.deploy();
    const libDappletRegistryRead = await LibDappletRegistryRead.deploy();

    await deployDappletNFT.deployed();
    await libDappletRegistryRead.deployed();

    dappletContract = deployDappletNFT;

    const DappletRegistry = await ethers.getContractFactory("DappletRegistry", {
      signer: acc1,
      libraries: {
        LibDappletRegistryRead: libDappletRegistryRead.address,
      },
    });
    const deployDappletRegistry = await DappletRegistry.deploy(
      dappletContract.address,
    );
    await deployDappletRegistry.deployed();
    registryContract = deployDappletRegistry;

    await dappletContract.transferOwnership(registryContract.address);
  });

  it("checks if the ownership has been transfered", async () => {
    const owner = await dappletContract.owner();
    expect(owner).to.equal(registryContract.address);
  });

  it("should create NFT adding new module", async () => {
    const [_, dappletOwner] = await ethers.getSigners();
    const buyerAccount = await registryContract.connect(dappletOwner);

    expect(await dappletContract.totalSupply()).to.equal(0);
    expect(await dappletContract.balanceOf(dappletOwnerAddress)).to.equal(0);

    await addModuleInfo(buyerAccount, {
      moduleType: 2,
      context: ["instagram.com"],
      description: "instagram-adapter-test",
      name: "instagram-adapter-test",
      title: "Instagram Adapter Test",
    });

    expect(await dappletContract.totalSupply()).to.equal(1);
    expect(await dappletContract.ownerOf(1)).to.equal(dappletOwnerAddress);
    expect(await dappletContract.balanceOf(dappletOwnerAddress)).to.equal(1);
  });

  it("should return twitter adapter owner by contextId after addModuleInfo", async () => {
    await addModuleInfo(registryContract, {});
    await registryContract.changeMyListing([
      ["H", "twitter-adapter-test"],
      ["twitter-adapter-test", "T"],
    ]);

    const moduleByTwitter = await registryContract.getModulesInfoByListers(
      "twitter.com",
      [accountAddress],
      0,
    );
    const resultDataByTwitter = moduleByTwitter.modulesInfo.map(getValues);
    expect(resultDataByTwitter).to.have.deep.members([
      {
        name: "twitter-adapter-test",
        title: "twitter-adapter-test",
        description: "twitter-adapter-test",
      },
    ]);
    expect(moduleByTwitter.owners).to.eql([accountAddress]);
  });

  it("should transfer ownership of the module", async () => {
    const [_, dappletOwner, dappletBuyer] = await ethers.getSigners();
    const dappletOwnerToRegistry = await registryContract.connect(dappletOwner);

    await addModuleInfo(dappletOwnerToRegistry, {});
    const moduleIndex = await registryContract.getModuleIndx(
      "twitter-adapter-test",
    );

    const dappletOwnerToDNFT = await dappletContract.connect(dappletOwner);
    await dappletOwnerToDNFT["safeTransferFrom(address,address,uint256)"](
      dappletOwnerAddress,
      dappletBuyer.address,
      moduleIndex,
    );

    const modulesInfoByOwner = await registryContract.getModulesInfoByOwner(
      dappletBuyer.address,
      0,
      10,
    );
    const resultByOwner = modulesInfoByOwner[0].map(getValues);

    expect(resultByOwner).to.eql([
      {
        name: "twitter-adapter-test",
        title: "twitter-adapter-test",
        description: "twitter-adapter-test",
      },
    ]);
  });

  it("gives NFT contract address", async () => {
    const address = await registryContract.getNFTContractAddress();
    expect(dappletContract.address).to.equal(address);
  });
});
