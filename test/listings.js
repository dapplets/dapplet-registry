const { use, expect } = require("chai");
const { ethers } = require("hardhat");
const assertArrays = require("chai-arrays");
const addModuleInfo = require("../helpers/addModuleInfo");

use(assertArrays);

const H = 0;
const N = 0;
const T = 4294967295;

const ALL_TESTING_VALUES = convertIndexesToNames([
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
]);

function prepareArguments(args) {
  const convert = (index) => {
    if (index === H) {
      return "H"
    } else if (index === N) {
      return "H"
    } else if (index === T) {
      return "T"
    } else {
      return "module-" + index;
    }
  }

  return args.map(([prev, next]) => ({ prev: convert(prev), next: convert(next) }));
}

function convertIndexesToNames(arr) {
  return arr.map(x => 'module-' + x);
}

async function checkExistence(contract, lister, existsValues, nonExistsValues) {
  async function check(value, isExists) {
    const result = await contract.containsModuleInListing(lister, value);
    expect(result).to.equal(isExists);
  }

  await Promise.all([
    ...existsValues.map((x) => check(x, true)),
    ...nonExistsValues.map((x) => check(x, false)),
  ]);
}

describe("Listings", () => {
  let contract;
  let accountAddress;

  it("should deploy contract", async function () {
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
    
    await addModuleInfo(contract, { name: "module-1" });
    await addModuleInfo(contract, { name: "module-2" });
    await addModuleInfo(contract, { name: "module-3" });
    await addModuleInfo(contract, { name: "module-4" });
    await addModuleInfo(contract, { name: "module-5" });
    await addModuleInfo(contract, { name: "module-6" });
    await addModuleInfo(contract, { name: "module-7" });
    await addModuleInfo(contract, { name: "module-8" });
    await addModuleInfo(contract, { name: "module-9" });
    await addModuleInfo(contract, { name: "module-10" });
    await addModuleInfo(contract, { name: "module-11" });
    await addModuleInfo(contract, { name: "module-12" });
  });

  it("should create a listing with 5 items", async () => {
    const receipt = await contract.changeMyListing(
      prepareArguments([
        [H, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, T],
      ]),
    );
    console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

    const { modules: items, total } = await contract.getModulesOfListing(accountAddress, "default", 0, 0, false);
    const actual = items.map((x) => x.name.toString());
    const expected = convertIndexesToNames(["1", "2", "3", "4", "5"]);
    expect(actual).to.deep.equal(expected);
    expect(total.toString()).to.equal(expected.length.toString());

    const { listers } = await contract.getListers(0, 100);
    expect(listers).to.deep.equal([accountAddress]);

    await checkExistence(
      contract,
      accountAddress,
      expected,
      ALL_TESTING_VALUES.filter((x) => !expected.includes(x)),
    );
  });

  it("should rearrange the list", async () => {
    const receipt = await contract.changeMyListing(
      prepareArguments([
        [1, 4],
        [3, 5],
        [4, 2],
      ]),
    );
    console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

    const { modules: items, total } = await contract.getModulesOfListing(accountAddress, "default", 0, 0, false);
    const actual = items.map((x) => x.name.toString());
    const expected = convertIndexesToNames(["1", "4", "2", "3", "5"]);
    expect(actual).to.deep.equal(expected);    
    expect(total.toString()).to.equal(expected.length.toString());

    await checkExistence(
      contract,
      accountAddress,
      expected,
      ALL_TESTING_VALUES.filter((x) => !expected.includes(x)),
    );
  });

  it("should insert at the begining", async () => {
    const receipt = await contract.changeMyListing(
      prepareArguments([
        [H, 10],
        [10, 1],
      ]),
    );
    console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

    const { modules: items, total } = await contract.getModulesOfListing(accountAddress, "default", 0, 0, false);
    const actual = items.map((x) => x.name.toString());
    const expected = convertIndexesToNames(["10", "1", "4", "2", "3", "5"]);
    expect(actual).to.deep.equal(expected);    
    expect(total.toString()).to.equal(expected.length.toString());

    await checkExistence(
      contract,
      accountAddress,
      expected,
      ALL_TESTING_VALUES.filter((x) => !expected.includes(x)),
    );
  });

  it("should insert at the end", async () => {
    const receipt = await contract.changeMyListing(
      prepareArguments([
        [5, 7],
        [7, T],
      ]),
    );
    console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

    const { modules: items, total } = await contract.getModulesOfListing(accountAddress, "default", 0, 0, false);
    const actual = items.map((x) => x.name.toString());
    const expected = convertIndexesToNames(["10", "1", "4", "2", "3", "5", "7"]);
    expect(actual).to.deep.equal(expected);    
    expect(total.toString()).to.equal(expected.length.toString());

    await checkExistence(
      contract,
      accountAddress,
      expected,
      ALL_TESTING_VALUES.filter((x) => !expected.includes(x)),
    );
  });

  it("should insert in the middle", async () => {
    const receipt = await contract.changeMyListing(
      prepareArguments([
        [2, 11],
        [11, 3],
      ]),
    );
    console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

    const { modules: items, total } = await contract.getModulesOfListing(accountAddress, "default", 0, 0, false);
    const actual = items.map((x) => x.name.toString());
    const expected = convertIndexesToNames(["10", "1", "4", "2", "11", "3", "5", "7"]);
    expect(actual).to.deep.equal(expected);    
    expect(total.toString()).to.equal(expected.length.toString());

    await checkExistence(
      contract,
      accountAddress,
      expected,
      ALL_TESTING_VALUES.filter((x) => !expected.includes(x)),
    );
  });

  it("should delete the first", async () => {
    const receipt = await contract.changeMyListing(
      prepareArguments([
        [H, 1],
        [10, N],
      ]),
    );
    console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

    const { modules: items, total } = await contract.getModulesOfListing(accountAddress, "default", 0, 0, false);
    const actual = items.map((x) => x.name.toString());
    const expected = convertIndexesToNames(["1", "4", "2", "11", "3", "5", "7"]);
    expect(actual).to.deep.equal(expected);    
    expect(total.toString()).to.equal(expected.length.toString());

    await checkExistence(
      contract,
      accountAddress,
      expected,
      ALL_TESTING_VALUES.filter((x) => !expected.includes(x)),
    );
  });

  it("should delete the lastest", async () => {
    const receipt = await contract.changeMyListing(
      prepareArguments([
        [5, T],
        [7, N],
      ]),
    );
    console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

    const { modules: items, total } = await contract.getModulesOfListing(accountAddress, "default", 0, 0, false);
    const actual = items.map((x) => x.name.toString());
    const expected = convertIndexesToNames(["1", "4", "2", "11", "3", "5"]);
    expect(actual).to.deep.equal(expected);    
    expect(total.toString()).to.equal(expected.length.toString());

    await checkExistence(
      contract,
      accountAddress,
      expected,
      ALL_TESTING_VALUES.filter((x) => !expected.includes(x)),
    );
  });

  it("should delete in the middle", async () => {
    const receipt = await contract.changeMyListing(
      prepareArguments([
        [2, 3],
        [11, N],
      ]),
    );
    console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

    const { modules: items, total } = await contract.getModulesOfListing(accountAddress, "default", 0, 0, false);
    const actual = items.map((x) => x.name.toString());
    const expected = convertIndexesToNames(["1", "4", "2", "3", "5"]);
    expect(actual).to.deep.equal(expected);    
    expect(total.toString()).to.equal(expected.length.toString());

    await checkExistence(
      contract,
      accountAddress,
      expected,
      ALL_TESTING_VALUES.filter((x) => !expected.includes(x)),
    );
  });

  it("should swap the first and the lastest", async () => {
    const receipt = await contract.changeMyListing(
      prepareArguments([
        [H, 5],
        [1, T],
        [3, 1],
        [5, 4],
      ]),
    );
    console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

    const { modules: items, total } = await contract.getModulesOfListing(accountAddress, "default", 0, 0, false);
    const actual = items.map((x) => x.name.toString());
    const expected = convertIndexesToNames(["5", "4", "2", "3", "1"]);
    expect(actual).to.deep.equal(expected);    
    expect(total.toString()).to.equal(expected.length.toString());

    await checkExistence(
      contract,
      accountAddress,
      expected,
      ALL_TESTING_VALUES.filter((x) => !expected.includes(x)),
    );
  });

  it("should move the last to the first", async () => {
    const receipt = await contract.changeMyListing(
      prepareArguments([
        [H, 1],
        [1, 5],
        [3, T],
      ]),
    );
    console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

    const { modules: items, total } = await contract.getModulesOfListing(accountAddress, "default", 0, 0, false);
    const actual = items.map((x) => x.name.toString());
    const expected = convertIndexesToNames(["1", "5", "4", "2", "3"]);
    expect(actual).to.deep.equal(expected);    
    expect(total.toString()).to.equal(expected.length.toString());

    await checkExistence(
      contract,
      accountAddress,
      expected,
      ALL_TESTING_VALUES.filter((x) => !expected.includes(x)),
    );
  });

  it("should move the last to the first", async () => {
    const receipt = await contract.changeMyListing(
      prepareArguments([
        [H, 5],
        [1, T],
        [3, 1],
      ]),
    );
    console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

    const { modules: items, total } = await contract.getModulesOfListing(accountAddress, "default", 0, 0, false);
    const actual = items.map((x) => x.name.toString());
    const expected = convertIndexesToNames(["5", "4", "2", "3", "1"]);
    expect(actual).to.deep.equal(expected);    
    expect(total.toString()).to.equal(expected.length.toString());

    await checkExistence(
      contract,
      accountAddress,
      expected,
      ALL_TESTING_VALUES.filter((x) => !expected.includes(x)),
    );
  });

  it("shouldn't change the list", async () => {
    const receipt = await contract.changeMyListing(
      prepareArguments([
        [H, 5],
        [5, 4],
        [4, 2],
        [2, 3],
        [3, 1],
        [1, T],
      ]),
    );
    console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

    const { modules: items, total } = await contract.getModulesOfListing(accountAddress, "default", 0, 0, false);
    const actual = items.map((x) => x.name.toString());
    const expected = convertIndexesToNames(["5", "4", "2", "3", "1"]);
    expect(actual).to.deep.equal(expected);    
    expect(total.toString()).to.equal(expected.length.toString());

    await checkExistence(
      contract,
      accountAddress,
      expected,
      ALL_TESTING_VALUES.filter((x) => !expected.includes(x)),
    );
  });

  it("should fail on inconsistent changes", async () => {
    try {
      await contract.changeMyListing(
        prepareArguments([
          [H, 2],
          [H, 4],
          [4, 5],
        ]),
      );
      expect.fail("contract is not failed");
    } catch (e) {
      expect(e.message).to.have.string("Pointers within one side must not be repeated");
    }
  });

  it("paginate listing forward", async () => {
    const page_1 = await contract.getModulesOfListing(accountAddress, "default", 0, 2, false);
    expect(page_1.modules.map((x) => x.name.toString())).to.deep.equal(convertIndexesToNames(["5", "4"]));    
    expect(page_1.total.toString()).to.equal("5");
    
    const page_2 = await contract.getModulesOfListing(accountAddress, "default", 2, 2, false);
    expect(page_2.modules.map((x) => x.name.toString())).to.deep.equal(convertIndexesToNames(["2", "3"]));    
    expect(page_2.total.toString()).to.equal("5");

    const page_3 = await contract.getModulesOfListing(accountAddress, "default", 4, 2, false);
    expect(page_3.modules.map((x) => x.name.toString())).to.deep.equal(convertIndexesToNames(["1"]));    
    expect(page_3.total.toString()).to.equal("5");
  });

  it("paginate listing backward", async () => {
    const page_1 = await contract.getModulesOfListing(accountAddress, "default", 0, 2, true);
    expect(page_1.modules.map((x) => x.name.toString())).to.deep.equal(convertIndexesToNames(["1", "3"]));    
    expect(page_1.total.toString()).to.equal("5");
    
    const page_2 = await contract.getModulesOfListing(accountAddress, "default", 2, 2, true);
    expect(page_2.modules.map((x) => x.name.toString())).to.deep.equal(convertIndexesToNames(["2", "4"]));    
    expect(page_2.total.toString()).to.equal("5");

    const page_3 = await contract.getModulesOfListing(accountAddress, "default", 4, 2, true);
    expect(page_3.modules.map((x) => x.name.toString())).to.deep.equal(convertIndexesToNames(["5"]));    
    expect(page_3.total.toString()).to.equal("5");
  });

  it("should fail on inconsistent changes", async () => {
    try {
      await contract.changeMyListing(prepareArguments([[4, 3]]));
      expect.fail("contract is not failed");
    } catch (e) {
      expect(e.message).to.have.string("Inconsistent changes");
    }
  });

  it("should fail on inconsistent changes", async () => {
    try {
      await contract.changeMyListing(prepareArguments([[H, T]]));
      expect.fail("contract is not failed");
    } catch (e) {
      expect(e.message).to.have.string("Inconsistent changes");
    }
  });

  it("should fail on inconsistent changes", async () => {
    try {
      await contract.changeMyListing(prepareArguments([[H, 1]]));
      expect.fail("contract is not failed");
    } catch (e) {
      expect(e.message).to.have.string("Inconsistent changes");
    }
  });

  it("should fail on inconsistent changes", async () => {
    try {
      await contract.changeMyListing(prepareArguments([[5, T]]));
      expect.fail("contract is not failed");
    } catch (e) {
      expect(e.message).to.have.string("Inconsistent changes");
    }
  });

  it("should return listers", async () => {
    const accounts = await ethers.getSigners();
    const expectedAccounts = [accounts[0].address];

    for (let i = 1; i < 11; i++) {
      const account = accounts[i];
      const _contract = await contract.connect(account);
      const receipt = await _contract.changeMyListing(
        prepareArguments([
          [H, 1],
          [1, T],
        ]),
      );
      await receipt.wait();
      expectedAccounts.push(account.address);
    }

    const listers = await contract.getListersByModule("module-1", 0, 0);
    expect(listers).deep.eq(expectedAccounts);
  });

  it("should wipe a listing", async () => {
    const accounts = await ethers.getSigners();
    const accountAddress = accounts[0].address;
    const _contract = await contract.connect(accounts[0]);

    const { modules: items } = await _contract.getModulesOfListing(accountAddress, "default", 0, 0, false);
    
    const links = [
      { prev: "H", next: "T" },
      ...items.map(x => ({ prev: x.name, next: "H" }))
    ];

    const receipt = await _contract.changeMyListing(links);
    await receipt.wait();

    const { modules: itemsAfter, total } = await _contract.getModulesOfListing(accountAddress, "default", 0, 0, false);

    expect(itemsAfter).length(0);
    expect(total.toString()).eql("0");
  });
});
