const { use, expect } = require("chai");
const { ethers } = require("hardhat");
const assertArrays = require("chai-arrays");
use(assertArrays);

const H = 0;
const N = 0;
const T = 4294967295;

const ALL_TESTING_VALUES = [
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
];

function prepareArguments(args) {
    return args;
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

describe("Listings", (accounts) => {
    let contract;
    let accountAddress;

    it("should deploy contract", async function () {
        const [acc1] = await ethers.getSigners();

        const Listings = await ethers.getContractFactory("Listings");
        const deploy = await Listings.deploy();
        await deploy.deployed();

        accountAddress = acc1.address;
        contract = deploy;
    });

    it("should create a listing with 5 items", async () => {
        const receipt = await contract.changeMyList(
            prepareArguments([
                [H, 1],
                [1, 2],
                [2, 3],
                [3, 4],
                [4, 5],
                [5, T],
            ])
        );
        console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

        const items = await contract.getLinkedList(accountAddress);
        const actual = items.map((x) => x.toString());
        const expected = ["1", "2", "3", "4", "5"];
        expect(actual).to.deep.equal(expected);

        const size = await contract.getLinkedListSize(accountAddress);
        expect(size.toString()).to.equal(expected.length.toString());

        const listers = await contract.getListers();
        expect(listers).to.deep.equal([accountAddress]);

        await checkExistence(
            contract,
            accountAddress,
            expected,
            ALL_TESTING_VALUES.filter((x) => !expected.includes(x))
        );
    });

    it("should rearrange the list", async () => {
        const receipt = await contract.changeMyList(
            prepareArguments([
                [1, 4],
                [3, 5],
                [4, 2],
            ])
        );
        console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

        const items = await contract.getLinkedList(accountAddress);
        const actual = items.map((x) => x.toString());
        const expected = ["1", "4", "2", "3", "5"];
        expect(actual).to.deep.equal(expected);

        const size = await contract.getLinkedListSize(accountAddress);
        expect(size.toString()).to.equal(expected.length.toString());

        await checkExistence(
            contract,
            accountAddress,
            expected,
            ALL_TESTING_VALUES.filter((x) => !expected.includes(x))
        );
    });

    it("should insert at the begining", async () => {
        const receipt = await contract.changeMyList(
            prepareArguments([
                [H, 10],
                [10, 1],
            ])
        );
        console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

        const items = await contract.getLinkedList(accountAddress);
        const actual = items.map((x) => x.toString());
        const expected = ["10", "1", "4", "2", "3", "5"];
        expect(actual).to.deep.equal(expected);

        const size = await contract.getLinkedListSize(accountAddress);
        expect(size.toString()).to.equal(expected.length.toString());

        await checkExistence(
            contract,
            accountAddress,
            expected,
            ALL_TESTING_VALUES.filter((x) => !expected.includes(x))
        );
    });

    it("should insert at the end", async () => {
        const receipt = await contract.changeMyList(
            prepareArguments([
                [5, 7],
                [7, T],
            ])
        );
        console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

        const items = await contract.getLinkedList(accountAddress);
        const actual = items.map((x) => x.toString());
        const expected = ["10", "1", "4", "2", "3", "5", "7"];
        expect(actual).to.deep.equal(expected);

        const size = await contract.getLinkedListSize(accountAddress);
        expect(size.toString()).to.equal(expected.length.toString());

        await checkExistence(
            contract,
            accountAddress,
            expected,
            ALL_TESTING_VALUES.filter((x) => !expected.includes(x))
        );
    });

    it("should insert in the middle", async () => {
        const receipt = await contract.changeMyList(
            prepareArguments([
                [2, 11],
                [11, 3],
            ])
        );
        console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

        const items = await contract.getLinkedList(accountAddress);
        const actual = items.map((x) => x.toString());
        const expected = ["10", "1", "4", "2", "11", "3", "5", "7"];
        expect(actual).to.deep.equal(expected);

        const size = await contract.getLinkedListSize(accountAddress);
        expect(size.toString()).to.equal(expected.length.toString());

        await checkExistence(
            contract,
            accountAddress,
            expected,
            ALL_TESTING_VALUES.filter((x) => !expected.includes(x))
        );
    });

    it("should delete the first", async () => {
        const receipt = await contract.changeMyList(
            prepareArguments([
                [H, 1],
                [10, N],
            ])
        );
        console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

        const items = await contract.getLinkedList(accountAddress);
        const actual = items.map((x) => x.toString());
        const expected = ["1", "4", "2", "11", "3", "5", "7"];
        expect(actual).to.deep.equal(expected);

        const size = await contract.getLinkedListSize(accountAddress);
        expect(size.toString()).to.equal(expected.length.toString());

        await checkExistence(
            contract,
            accountAddress,
            expected,
            ALL_TESTING_VALUES.filter((x) => !expected.includes(x))
        );
    });

    it("should delete the lastest", async () => {
        const receipt = await contract.changeMyList(
            prepareArguments([
                [5, T],
                [7, N],
            ])
        );
        console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

        const items = await contract.getLinkedList(accountAddress);
        const actual = items.map((x) => x.toString());
        const expected = ["1", "4", "2", "11", "3", "5"];
        expect(actual).to.deep.equal(expected);

        const size = await contract.getLinkedListSize(accountAddress);
        expect(size.toString()).to.equal(expected.length.toString());

        await checkExistence(
            contract,
            accountAddress,
            expected,
            ALL_TESTING_VALUES.filter((x) => !expected.includes(x))
        );
    });

    it("should delete in the middle", async () => {
        const receipt = await contract.changeMyList(
            prepareArguments([
                [2, 3],
                [11, N],
            ])
        );
        console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

        const items = await contract.getLinkedList(accountAddress);
        const actual = items.map((x) => x.toString());
        const expected = ["1", "4", "2", "3", "5"];
        expect(actual).to.deep.equal(expected);

        const size = await contract.getLinkedListSize(accountAddress);
        expect(size.toString()).to.equal(expected.length.toString());

        await checkExistence(
            contract,
            accountAddress,
            expected,
            ALL_TESTING_VALUES.filter((x) => !expected.includes(x))
        );
    });

    it("should swap the first and the lastest", async () => {
        const receipt = await contract.changeMyList(
            prepareArguments([
                [H, 5],
                [1, T],
                [3, 1],
                [5, 4],
            ])
        );
        console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

        const items = await contract.getLinkedList(accountAddress);
        const actual = items.map((x) => x.toString());
        const expected = ["5", "4", "2", "3", "1"];
        expect(actual).to.deep.equal(expected);

        const size = await contract.getLinkedListSize(accountAddress);
        expect(size.toString()).to.equal(expected.length.toString());

        await checkExistence(
            contract,
            accountAddress,
            expected,
            ALL_TESTING_VALUES.filter((x) => !expected.includes(x))
        );
    });

    it("should move the last to the first", async () => {
        const receipt = await contract.changeMyList(
            prepareArguments([
                [H, 1],
                [1, 5],
                [3, T],
            ])
        );
        console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

        const items = await contract.getLinkedList(accountAddress);
        const actual = items.map((x) => x.toString());
        const expected = ["1", "5", "4", "2", "3"];
        expect(actual).to.deep.equal(expected);

        const size = await contract.getLinkedListSize(accountAddress);
        expect(size.toString()).to.equal(expected.length.toString());

        await checkExistence(
            contract,
            accountAddress,
            expected,
            ALL_TESTING_VALUES.filter((x) => !expected.includes(x))
        );
    });

    it("should move the last to the first", async () => {
        const receipt = await contract.changeMyList(
            prepareArguments([
                [H, 5],
                [1, T],
                [3, 1],
            ])
        );
        console.log(`GasUsed: ${(await receipt.wait()).gasUsed.toString()}`);

        const items = await contract.getLinkedList(accountAddress);
        const actual = items.map((x) => x.toString());
        const expected = ["5", "4", "2", "3", "1"];
        expect(actual).to.deep.equal(expected);

        const size = await contract.getLinkedListSize(accountAddress);
        expect(size.toString()).to.equal(expected.length.toString());

        await checkExistence(
            contract,
            accountAddress,
            expected,
            ALL_TESTING_VALUES.filter((x) => !expected.includes(x))
        );
    });
});
