const { use, expect } = require("chai");
const { ethers } = require("hardhat");
const assertArrays = require("chai-arrays");
const chaiAsPromised = require("chai-as-promised");
const addModuleInfo = require("../helpers/addModuleInfo");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { convertToEthMi, convertToEthVi } = require("../helpers/convert");
const md5 = require("md5");
use(assertArrays);
use(chaiAsPromised);

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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
        version: data.version,
        extensionVersion: data.extensionVersion,
    };
};

const addVersion = ({
    branch = "default",
    version = "0x09080700",
    extensionVersion = "0x00ff0100",
    createdAt = 0,
}) => {
    return {
        branch,
        version,
        flags: 0,
        binary: {
            hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
            uris: [],
        },
        dependencies: [],
        interfaces: [],
        extensionVersion,
        createdAt,
    };
};

const EMPTY_VERSION_INFO = {
    branch: "",
    version: "0x00000000",
    flags: 0,
    binary: {
        hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        uris: [],
    },
    dependencies: [],
    interfaces: [],
    extensionVersion: "0x00000000",
    createdAt: 0,
};

describe("DappletRegistry", function () {
    let contract;
    let nftContract;
    let accountAddress;
    let tokenContract;

    beforeEach(async function () {
        const [acc1] = await ethers.getSigners();
        accountAddress = acc1.address;

        const DappletNFT = await ethers.getContractFactory("DappletNFT", acc1);
        const deployDappletNFT = await DappletNFT.deploy();
        await deployDappletNFT.deployed();

        const LibRegistryRead = await ethers.getContractFactory(
            "LibDappletRegistryRead",
            acc1
        );
        const libRegistryRead = await LibRegistryRead.deploy();
        await libRegistryRead.deployed();

        const LibRegistryReadExt = await ethers.getContractFactory(
            "LibDappletRegistryReadExt",
            acc1
        );
        const libRegistryReadExt = await LibRegistryReadExt.deploy();
        await libRegistryReadExt.deployed();

        const DappletRegistry = await ethers.getContractFactory(
            "DappletRegistry",
            {
                signer: acc1,
                libraries: {
                    LibDappletRegistryRead: libRegistryRead.address,
                    LibDappletRegistryReadExt: libRegistryReadExt.address,
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

        const ERC20Mock = await ethers.getContractFactory("ERC20Mock", acc1);
        tokenContract = await ERC20Mock.deploy();
        await tokenContract.deployed();
    // });

    // beforeEach(async function() {
        // BURNING DAPPLET (burning affects other tests)

        const [,,staker,burner] = await ethers.getSigners();

        // enable staking
        await contract.setStakeParameters(
            tokenContract.address,
            await contract.period(),
            await contract.minDuration(),
            await contract.basePrice(),
            await contract.burnShare(),
        );

        // approve tokens
        const price = "1000000000000000000"; 
        await tokenContract.mint(staker.address, price);
        await tokenContract.connect(staker).approve(contract.address, price);

        // create duc
        const reservationPeriod = 60 * 60 * 24 * 30; // 1 month
        await addModuleInfo(contract.connect(staker), {
            moduleType: 1, // 1 - dapplet
            context: ["duc.local"],
            interfaces: [],
            description: "duc",
            name: "duc",
            title: "duc",
        }, EMPTY_VERSION_INFO, reservationPeriod);

        // burn duc
        const stakeInfo_1 = await contract.stakes("duc");
        await helpers.time.increaseTo(stakeInfo_1.endsAt);
        await contract.connect(burner).burnDUC("duc");

        // disable staking
        await contract.setStakeParameters(
            ZERO_ADDRESS,
            await contract.period(),
            await contract.minDuration(),
            await contract.basePrice(),
            await contract.burnShare(),
        );

        // END BURNING DAPPLET
    });

    it("The contract is constructed", async function () {
        expect(contract.address).to.be.properAddress;
    });

    it("should return zero modules by contextId", async () => {
        const moduleInfo = await contract.getModulesInfoByListersBatch(
            ["twitter.com"],
            [accountAddress],
            0
        );
        expect(moduleInfo).to.eql([[[]], [[]]]);
    });

    it("DUC staking should be disabled", async () => {
        const stakingToken = await contract.stakingToken();
        expect(stakingToken).to.eql(ZERO_ADDRESS);
    });

    it("should deploy DUC with disabled staking", async () => {
        await addModuleInfo(contract, {
            moduleType: 1, // 1 - dapplet
            context: ["duc.local"],
            interfaces: [],
            description: "duc",
            name: "duc",
            title: "duc",
        }, EMPTY_VERSION_INFO);

        const moduleInfo = await contract.getModuleInfoByName("duc");
        const stakeStatus = await contract.getStakeStatus("duc");

        // deploy regular dapplet
        await contract.addModuleVersion(
            "duc",
            addVersion({ branch: "default", version: "0x00010000" })
        );

        const moduleInfoAfter = await contract.getModuleInfoByName("duc");

        expect(moduleInfo.modules.name).to.eql("duc");
        expect(moduleInfo.modules.flags.toString()).to.eql("1"); // DUC flag
        expect(moduleInfoAfter.modules.flags.toString()).to.eql("0"); // DUC flag
        expect(stakeStatus).to.eql(0); // NO_STAKE
    });

    it("should deploy DUC with enabled staking + stake release", async () => {
        // enable staking
        await contract.setStakeParameters(
            tokenContract.address,
            await contract.period(),
            await contract.minDuration(),
            await contract.basePrice(),
            await contract.burnShare(),
        );

        const stakingToken = await contract.stakingToken();

        // approve tokens
        const price = "1000000000000000000"; 
        const [acc1] = await ethers.getSigners();
        await tokenContract.mint(acc1.address, price);
        await tokenContract.approve(contract.address, price);

        // deploy DUC
        const reservationPeriod = 60 * 60 * 24 * 30; // 1 month

        await addModuleInfo(contract, {
            moduleType: 1, // 1 - dapplet
            context: ["duc.local"],
            interfaces: [],
            description: "duc",
            name: "duc",
            title: "duc",
        }, EMPTY_VERSION_INFO, reservationPeriod);

        const timestamp_1 = await helpers.time.latest();
        const moduleInfo_1 = await contract.getModuleInfoByName("duc");
        const stakeStatus_1 = await contract.getStakeStatus("duc");
        const userBalance_1 = await tokenContract.balanceOf(acc1.address);
        const ducBalance_1 = await tokenContract.balanceOf(contract.address);
        const stakeInfo_1 = await contract.stakes("duc");
        const isDUC_1 = await contract.isDUC("duc");

        // deploy regular dapplet
        await contract.addModuleVersion(
            "duc",
            addVersion({ branch: "default", version: "0x00010000" })
        );

        const moduleInfo_2 = await contract.getModuleInfoByName("duc");
        const stakeStatus_2 = await contract.getStakeStatus("duc");
        const userBalance_2 = await tokenContract.balanceOf(acc1.address);
        const ducBalance_2 = await tokenContract.balanceOf(contract.address);
        const stakeInfo_2 = await contract.stakes("duc");
        const isDUC_2 = await contract.isDUC("duc");

        expect(stakingToken).to.eql(tokenContract.address);
        expect(moduleInfo_1.modules.name).to.eql("duc");
        expect(moduleInfo_1.modules.flags.toString()).to.eql("1"); // DUC flag
        expect(stakeStatus_1).to.eql(1); // WAITING_FOR_REGULAR_DAPPLET
        expect(userBalance_1.toString()).to.eql("0");
        expect(ducBalance_1.toString()).to.eql(price);
        expect(stakeInfo_1.amount.toString()).to.eql(price);
        expect(stakeInfo_1.duration.toString()).to.eql(reservationPeriod.toString());
        expect(stakeInfo_1.endsAt.toString()).to.eql((timestamp_1 + reservationPeriod).toString());
        expect(isDUC_1).to.eql(true);

        expect(moduleInfo_2.modules.flags.toString()).to.eql("0"); // DUC flag
        expect(stakeStatus_2).to.eql(0); // NO_STAKE
        expect(userBalance_2.toString()).to.eql(price);
        expect(ducBalance_2.toString()).to.eql("0");
        expect(stakeInfo_2.amount.toString()).to.eql("0");
        expect(stakeInfo_2.duration.toString()).to.eql("0");
        expect(stakeInfo_2.endsAt.toString()).to.eql("0");
        expect(isDUC_2).to.eql(false);
    });

    it("should deploy DUC with enabled staking + burn stake", async () => {
        // enable staking
        await contract.setStakeParameters(
            tokenContract.address,
            await contract.period(),
            await contract.minDuration(),
            await contract.basePrice(),
            await contract.burnShare(),
        );

        const stakingToken = await contract.stakingToken();

        // approve tokens
        const price = "1000000000000000000"; 
        const [acc1] = await ethers.getSigners();
        await tokenContract.mint(acc1.address, price);
        await tokenContract.approve(contract.address, price);

        // deploy DUC
        const reservationPeriod = 60 * 60 * 24 * 30; // 1 month

        await addModuleInfo(contract, {
            moduleType: 1, // 1 - dapplet
            context: ["duc.local"],
            interfaces: [],
            description: "duc",
            name: "duc",
            title: "duc",
        }, EMPTY_VERSION_INFO, reservationPeriod);

        const timestamp_1 = await helpers.time.latest();
        const moduleInfo_1 = await contract.getModuleInfoByName("duc");
        const stakeStatus_1 = await contract.getStakeStatus("duc");
        const userBalance_1 = await tokenContract.balanceOf(acc1.address);
        const ducBalance_1 = await tokenContract.balanceOf(contract.address);
        const stakeInfo_1 = await contract.stakes("duc");
        const isDUC_1 = await contract.isDUC("duc");

        // stake expired
        await helpers.time.increaseTo(stakeInfo_1.endsAt);
        const stakeStatus_2 = await contract.getStakeStatus("duc");
        const isDUC_2 = await contract.isDUC("duc");

        // third person burns stake
        const [, burner] = await ethers.getSigners();
        await contract.connect(burner).burnDUC("duc");

        const stakeStatus_3 = await contract.getStakeStatus("duc");
        const burnerBalance_3 = await tokenContract.balanceOf(burner.address);
        const ducBalance_3 = await tokenContract.balanceOf(contract.address);
        const stakeInfo_3 = await contract.stakes("duc");

        expect(stakingToken).to.eql(tokenContract.address);
        expect(moduleInfo_1.modules.name).to.eql("duc");
        expect(moduleInfo_1.modules.flags.toString()).to.eql("1"); // DUC flag
        expect(stakeStatus_1).to.eql(1); // WAITING_FOR_REGULAR_DAPPLET
        expect(userBalance_1.toString()).to.eql("0");
        expect(ducBalance_1.toString()).to.eql(price);
        expect(stakeInfo_1.amount.toString()).to.eql(price);
        expect(stakeInfo_1.duration.toString()).to.eql(reservationPeriod.toString());
        expect(stakeInfo_1.endsAt.toString()).to.eql((timestamp_1 + reservationPeriod).toString());
        expect(isDUC_1).to.eql(true);

        expect(stakeStatus_2).to.eql(2); // READY_TO_BURN
        expect(isDUC_2).to.eql(true);

        expect(stakeStatus_3).to.eql(0); // NO_STAKE
        expect(burnerBalance_3.toString()).to.eql(price);
        expect(ducBalance_3.toString()).to.eql("0");
        expect(stakeInfo_3.amount.toString()).to.eql("0");
        expect(stakeInfo_3.duration.toString()).to.eql("0");
        expect(stakeInfo_3.endsAt.toString()).to.eql("0");

        try {
            await contract.isDUC("duc");
            expect.fail("contract is not failed");
        } catch (e) {
            expect(e.message).to.have.string("The module does not exist");
        }

        try {
            await contract.getModuleInfoByName("duc");
            expect.fail("contract is not failed");
        } catch (e) {
            expect(e.message).to.have.string("The module does not exist");
        }
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

        await contract.changeMyListing([
            ["H", "identity-feature-test"],
            ["identity-feature-test", "T"],
        ]);

        const moduleByTwitter = await contract.getModulesInfoByListersBatch(
            ["twitter.com"],
            [accountAddress],
            0
        );
        const moduleByInstagram = await contract.getModulesInfoByListersBatch(
            ["instagram.com"],
            [accountAddress],
            0
        );

        const resultDataByTwitter = moduleByTwitter.modules[0].map(getValues);
        const resultDataByInstagram =
            moduleByInstagram.modules[0].map(getValues);

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

        await contract.changeMyListing([
            ["H", "twitter-adapter-test"],
            ["twitter-adapter-test", "T"],
        ]);

        await contract.addContextId("twitter-adapter-test", "yahoo.com");

        const moduleByContext = await contract.getModulesInfoByListersBatch(
            ["yahoo.com"],
            [accountAddress],
            0
        );

        const resultModuleById = moduleByContext.modules[0].map(getValues);
        expect(resultModuleById).to.eql([
            {
                name: "twitter-adapter-test",
                title: "twitter-adapter-test",
                description: "twitter-adapter-test",
            },
        ]);

        await contract.removeContextId("twitter-adapter-test", "yahoo.com");

        const moduleInfo = await contract.getModulesInfoByListersBatch(
            ["yahoo.com"],
            [accountAddress],
            0
        );

        expect(moduleInfo.modules[0]).to.eql([]);
    });

    it("only the Owner can add the ContextID", async () => {
        const [_, acc2] = await ethers.getSigners();
        await addModuleInfo(contract, { accountAddress });
        await contract.changeMyListing([
            ["H", "twitter-adapter-test"],
            ["twitter-adapter-test", "T"],
        ]);
        const differentAccount = await contract.connect(acc2);
        const error = differentAccount.addContextId(
            "twitter-adapter-test",
            "yahoo.com"
        );

        return expect(error).to.eventually.be.rejected.and.be.an.instanceOf(
            Error
        );
    });

    it("only the Owner can remove the ContextID", async () => {
        const [_, acc2] = await ethers.getSigners();
        await addModuleInfo(contract, { accountAddress });
        await contract.changeMyListing([
            ["H", "twitter-adapter-test"],
            ["twitter-adapter-test", "T"],
        ]);
        await contract.addContextId("twitter-adapter-test", "yahoo.com");

        const differentAccount = await contract.connect(acc2);
        const error = differentAccount.removeContextId(
            "twitter-adapter-test",
            "yahoo.com"
        );

        return expect(error).to.eventually.be.rejected.and.be.an.instanceOf(
            Error
        );
    });

    it("empty array of modules when received from another address", async () => {
        const [_, acc2] = await ethers.getSigners();

        await addModuleInfo(contract, {});

        const moduleInfo = await contract.getModulesInfoByListersBatch(
            ["twitter.com"],
            [acc2.address],
            0
        );

        expect(moduleInfo.modules[0]).to.be.equalTo([]);
    });

    it("should return information on the added module", async () => {
        await addModuleInfo(contract, {});

        const moduleInfoByName = await contract.getModuleInfoByName(
            "twitter-adapter-test"
        );
        const modulesByOwner = await contract.getModulesByOwner(
            accountAddress,
            "default",
            0,
            10,
            false
        );
        const resultByName = getValues(moduleInfoByName.modules);
        const resultByOwner = modulesByOwner.modules.map(getValues);

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

    it("should return NFT metadata of the added module", async () => {
        await addModuleInfo(contract, {
            icon: {
                hash: "0xa4e7276f2d161a820266adcc3dff5deaeb1845015b4c07fe2667068349578968",
                uris: ["ipfs://Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu"],
            },
            image: {
                hash: "0xa4e7276f2d161a820266adcc3dff5deaeb1845015b4c07fe2667068349578968",
                uris: [
                    "bzz://e073745366ec7ad6605c00bffd232a59fb523a8529b8b24cf1578412ec56b466",
                ],
            },
        });

        const moduleIndex = await contract.getModuleIndex("twitter-adapter-test");

        const uri = await nftContract.tokenURI(moduleIndex);
        expect(uri).to.contain("data:application/json;base64,");

        const base64 = uri.replace("data:application/json;base64,", "");
        const json = atob(base64);
        const metadata = JSON.parse(json);

        const description =
            `This NFT is a proof of ownership of the "twitter-adapter-test".\n\n` +
            `twitter-adapter-test\n\n` +
            `This module is a part of the Dapplets Project ecosystem for augmented web. All modules are available in the Dapplets Store.`;

        expect(metadata).to.eql({
            name: 'Adapter "twitter-adapter-test"',
            image: "ipfs://Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu",
            description: description,
            attributes: [
                {
                    trait_type: "Name",
                    value: "twitter-adapter-test",
                },
                {
                    trait_type: "Module Type",
                    value: "Adapter",
                },
            ],
        });
    });

    it("should return NFT contract level metadata", async () => {
        const uri = await nftContract.contractURI();
        expect(uri).to.contain("data:application/json;base64,");

        const base64 = uri.replace("data:application/json;base64,", "");
        const json = atob(base64);
        const metadata = JSON.parse(json);

        expect(metadata).to.eql({
            name: "Dapplets",
            description:
                "Dapplets Project is an open Augmented Web infrastructure for decentralized Apps (dapplets), all powered by crypto technologies. Our system is open-source and available to developers anywhere in the world.",
            image: "ipfs://QmbU1jjPeHN4ikENaAatqkNPPNL4tKByJg7B4be4ESWDwn",
            external_link: "https://dapplets.org",
        });
    });

    it("should edit title and description module", async () => {
        await addModuleInfo(contract, {});

        await contract.editModuleInfo(
            "twitter-adapter-test",
            "twitter-adapter-title",
            "twitter-adapter-description",
            {
                hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
                uris: [],
            },
            {
                hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
                uris: [],
            },
            {
                hash: "0x0000000000000000000000000000000000000000000000000000000000000004",
                uris: [],
            }
        );

        const moduleInfo = await contract.getModuleInfoByName(
            "twitter-adapter-test"
        );
        const resultByName = {
            name: moduleInfo.modules.name,
            title: moduleInfo.modules.title,
            description: moduleInfo.modules.description,
            manifest: {
                hash: moduleInfo.modules.manifest.hash,
                uris: moduleInfo.modules.manifest.uris,
            },
            icon: {
                hash: moduleInfo.modules.icon.hash,
                uris: moduleInfo.modules.icon.uris,
            },
        };

        expect(resultByName).to.eql({
            name: "twitter-adapter-test",
            title: "twitter-adapter-title",
            description: "twitter-adapter-description",
            manifest: {
                hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
                uris: [],
            },
            icon: {
                hash: "0x0000000000000000000000000000000000000000000000000000000000000004",
                uris: [],
            },
        });
    });

    it("should add a new version to the module", async () => {
        await addModuleInfo(contract, {});

        await contract.addModuleVersion(
            "twitter-adapter-test",
            addVersion({
                extensionVersion: "0x00f11900",
            })
        );

        const getVersionInfo = await contract.getVersionInfo(
            "twitter-adapter-test",
            "default",
            "0x09080700"
        );

        const resultVersion = getVersionInfo.map(getVersion)[0];
        expect(resultVersion).to.eql({
            branch: "default",
            version: "0x09080700",
            extensionVersion: "0x00f11900",
        });
    });

    it("should create and delete admins for the module", async () => {
        const [_, acc2, acc3] = await ethers.getSigners();

        await addModuleInfo(contract, {});

        // Сreate
        await contract.addAdmin("twitter-adapter-test", acc2.address);
        await contract.addAdmin("twitter-adapter-test", acc3.address);

        const createAdmins = await contract.getAdminsByModule(
            "twitter-adapter-test"
        );
        expect(createAdmins).to.eql([acc2.address, acc3.address]);

        // Remove acc2 address
        await contract.removeAdmin("twitter-adapter-test", acc2.address);
        const removeAdmins = await contract.getAdminsByModule(
            "twitter-adapter-test"
        );
        expect(removeAdmins).to.eql([acc3.address]);
    });

    it("only the owner can add a new administrator", async () => {
        const [_, acc2] = await ethers.getSigners();

        await addModuleInfo(contract, {});
        const differentAccount = await contract.connect(acc2);

        const error = differentAccount.addAdmin(
            "twitter-adapter-test",
            acc2.address
        );
        return expect(error).to.eventually.be.rejected.and.be.an.instanceOf(
            Error
        );
    });

    it("adding a new version with administrator rights", async () => {
        const [_, acc2] = await ethers.getSigners();

        await addModuleInfo(contract, {});
        await contract.addAdmin("twitter-adapter-test", acc2.address);

        const differentAccount = await contract.connect(acc2);
        await differentAccount.addModuleVersion(
            "twitter-adapter-test",
            addVersion({})
        );

        const getVersionInfo = await contract.getVersionInfo(
            "twitter-adapter-test",
            "default",
            "0x09080700"
        );
        const resultVersion = getVersionInfo.map(getVersion)[0];

        expect(resultVersion).to.eql({
            branch: "default",
            version: "0x09080700",
            extensionVersion: "0x00ff0100",
        });
    });

    it("person without administrator rights cannot add a new version of the module", async () => {
        const [_, acc2] = await ethers.getSigners();
        await addModuleInfo(contract, {});

        const differentAccount = await contract.connect(acc2);

        const error = differentAccount.addModuleVersion(
            "twitter-adapter-test",
            addVersion({})
        );

        return expect(error).to.eventually.be.rejected.and.be.an.instanceOf(
            Error
        );
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
        const names = [];
        for (let i = 0; i < 20; i++) {
            await addModuleInfo(contract, {
                accountAddress,
                title: `twitter-adapter-test-${i}`,
                description: `twitter-adapter-test-${i}`,
                name: `twitter-adapter-test-${i}`,
                context: [],
                interfaces: [],
            });
            names.push(`twitter-adapter-test-${i}`);
        }

        const startModuleIndex = await contract.getModuleIndex(names[0]);
        const startOffset = startModuleIndex - 1;

        const page_1 = await contract.getModules("default", startOffset, 10, false);
        expect(page_1.modules.map((x) => x.name)).deep.eq(
            [...names].splice(0, 10)
        );

        const page_2 = await contract.getModules("default", startOffset + 10, 10, false);
        expect(page_2.modules.map((x) => x.name)).deep.eq(
            [...names].splice(10, 10)
        );

        const page_1_reversed = await contract.getModules(
            "default",
            0,
            10,
            true
        );
        expect(page_1_reversed.modules.map((x) => x.name)).deep.eq(
            [...names].reverse().splice(0, 10)
        );

        const page_2_reversed = await contract.getModules(
            "default",
            10,
            10,
            true
        );
        expect(page_2_reversed.modules.map((x) => x.name)).deep.eq(
            [...names].reverse().splice(10, 10)
        );

        const page_1_owned = await contract.getModulesByOwner(
            accountAddress,
            "default",
            0,
            10,
            false
        );
        expect(page_1_owned.modules.map((x) => x.name)).deep.eq(
            [...names].splice(0, 10)
        );

        const page_2_owned = await contract.getModulesByOwner(
            accountAddress,
            "default",
            10,
            10,
            false
        );
        expect(page_2_owned.modules.map((x) => x.name)).deep.eq(
            [...names].splice(10, 10)
        );

        const page_1_owned_reversed = await contract.getModulesByOwner(
            accountAddress,
            "default",
            0,
            10,
            true
        );
        expect(page_1_owned_reversed.modules.map((x) => x.name)).deep.eq(
            [...names].reverse().splice(0, 10)
        );

        const page_2_owned_reversed = await contract.getModulesByOwner(
            accountAddress,
            "default",
            10,
            10,
            true
        );
        expect(page_2_owned_reversed.modules.map((x) => x.name)).deep.eq(
            [...names].reverse().splice(10, 10)
        );
    });

    it("should returns all elements", async () => {
        const result = await contract.getModules("default", 0, 100, false);
        expect(result.modules.length).gt(0);
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

        await contract.changeMyListing([
            ["H", name],
            [name, "T"],
        ]);

        const moduleByContext = await contract.getModules(
            "default",
            0,
            1,
            true
        );

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
        await addModuleInfo(contract, {}, EMPTY_VERSION_INFO);

        await contract.addModuleVersion(
            "twitter-adapter-test",
            addVersion({ branch: "default", version: "0x00010000" })
        );

        await contract.addModuleVersion(
            "twitter-adapter-test",
            addVersion({ branch: "default", version: "0x00010100" })
        );

        await contract.addModuleVersion(
            "twitter-adapter-test",
            addVersion({ branch: "new", version: "0x00010000" })
        );

        await contract.addModuleVersion(
            "twitter-adapter-test",
            addVersion({ branch: "new", version: "0x00010100" })
        );

        await contract.addModuleVersion(
            "twitter-adapter-test",
            addVersion({ branch: "legacy", version: "0x00010000" })
        );

        await contract.addModuleVersion(
            "twitter-adapter-test",
            addVersion({ branch: "legacy", version: "0x00010100" })
        );

        const branches = await contract.getBranchesByModule(
            "twitter-adapter-test"
        );
        expect(branches).to.deep.eq(["default", "new", "legacy"]);
    });

    it("returns an array of versions desc and asc", async () => {
        await addModuleInfo(
            contract,
            {
                name: "version-numbers-test",
            },
            EMPTY_VERSION_INFO
        );

        await contract.addModuleVersion(
            "version-numbers-test",
            addVersion({ branch: "default", version: "0x00010000" })
        );

        await contract.addModuleVersion(
            "version-numbers-test",
            addVersion({ branch: "default", version: "0x00010100" })
        );

        await contract.addModuleVersion(
            "version-numbers-test",
            addVersion({ branch: "default", version: "0x00010200" })
        );

        const { versions: forwardVersions, total: forwardTotalVersions } =
            await contract.getVersionsByModule(
                "version-numbers-test",
                "default",
                0,
                100,
                false
            );
        expect(forwardTotalVersions.toString()).to.eql("3");
        expect(forwardVersions.map((x) => x.version)).to.have.deep.members([
            "0x00010000",
            "0x00010100",
            "0x00010200",
        ]);

        const { versions: reversedVersions, total: reversedTotalVersions } =
            await contract.getVersionsByModule(
                "version-numbers-test",
                "default",
                0,
                100,
                false
            );
        expect(reversedTotalVersions.toString()).to.eql("3");
        expect(reversedVersions.map((x) => x.version)).to.have.deep.members([
            "0x00010200",
            "0x00010100",
            "0x00010000",
        ]);
    });

    it("should fail incorrect versioning", async () => {
        await addModuleInfo(
            contract,
            {
                name: "versioning-test",
            },
            EMPTY_VERSION_INFO
        );

        try {
            await contract.addModuleVersion(
                "versioning-test",
                addVersion({ branch: "default", version: "0x010203FF" }) // v1.2.3
            );

            await contract.addModuleVersion(
                "versioning-test",
                addVersion({ branch: "default", version: "0x010202FF" }) // v1.2.2
            );

            expect.fail("contract is not failed");
        } catch (e) {
            expect(e.message).to.have.string("Version must be bumped");
        }
    });

    it("returns modules by third lister", async () => {
        const [, , , owner, lister] = await ethers.getSigners();
        const ownerConnectedContract = await contract.connect(owner);

        await ownerConnectedContract.addModuleInfo(
            [],
            [
              ['H', 'example-interface'],
              ['example-interface', 'T'],
            ],
            convertToEthMi({ name: "example-interface", moduleType: 4 }),
            convertToEthVi({ version: "0x000100ff" }),
            0
        );

        await ownerConnectedContract.addModuleInfo(
            ["example.com"],
            [
              ['example-interface', 'example-adapter'],
              ['example-adapter', 'T'],
            ],
            convertToEthMi({ name: "example-adapter", moduleType: 2 }),
            convertToEthVi({
                interfaces: [
                    {
                        name: "example-interface",
                        branch: "default",
                        version: "0x000100ff",
                    },
                ],
            }),
            0
        );

        for (let i = 1; i <= 20; i++) {
            await ownerConnectedContract.addModuleInfo(
                ["example-adapter"],
                [
                    [
                        i === 1 ? "example-adapter" : "example-dapplet-" + (i - 1),
                        "example-dapplet-" + i,
                    ],
                    ["example-dapplet-" + i, "T"],
                ],
                convertToEthMi({ name: "example-dapplet-" + i, moduleType: 1 }),
                convertToEthVi({}),
                0
            );
        }

        const listerConnecetedContract = await contract.connect(lister);

        await listerConnecetedContract.changeMyListing([
            ["H", "example-dapplet-1"],
            ["example-dapplet-1", "T"],
        ]);

        const response = await contract.getModulesInfoByListersBatch(
            ["example.com"],
            [lister.address],
            0
        );

        // ToDo: implement asserts
    });

    it("should return an owner of the module", async () => {
        const [acc1] = await ethers.getSigners();

        await addModuleInfo(contract.connect(acc1), {
            moduleType: 1,
            context: ["example.com"],
            description: "example-test",
            name: "example-test",
            title: "Example Test",
        });

        expect(await contract.ownerOf("example-test")).to.equal(acc1.address);
    });

    it("should return dependency inclusiveness", async () => {
        const [acc1] = await ethers.getSigners();

        await addModuleInfo(contract.connect(acc1), {
            moduleType: 2,
            context: ["example.com"],
            description: "no-adapter",
            name: "no-adapter",
            title: "No Adapter",
        });

        await addModuleInfo(contract.connect(acc1), {
            moduleType: 2,
            context: ["example.com"],
            description: "example-adapter",
            name: "example-adapter",
            title: "Example Adapter",
        });
        
        await addModuleInfo(contract.connect(acc1), {
            moduleType: 1,
            context: ["example.com"],
            description: "example-test",
            name: "example-test",
            title: "Example Test",
        }, {
            branch: "default",
            version: "0x00010000",
            flags: 0,
            binary: {
              hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
              uris: [],
            },
            dependencies: [{
                name: "example-adapter",
                branch: "default",
                version: "0x00010000"
            }],
            interfaces: [],
            extensionVersion: "0x00ff0100",
            createdAt: 0
          });

        expect(await contract.includesDependency("example-test", "example-adapter")).to.equal(true);
        expect(await contract.includesDependency("example-test", "no-adapter")).to.equal(false);
        expect(await contract.includesDependency("example-test", "non-existing-adapter")).to.equal(false);
    });


    it("checks if the ownership has been transfered", async () => {
        const owner = await nftContract.owner();
        expect(owner).to.equal(contract.address);
    });

    it("should create NFT adding new module", async () => {
        const [_, dappletOwner] = await ethers.getSigners();
        const buyerAccount = await contract.connect(dappletOwner);

        expect(await nftContract.totalSupply()).to.equal(0);
        expect(await nftContract.balanceOf(dappletOwner.address)).to.equal(
            0
        );

        await addModuleInfo(buyerAccount, {
            moduleType: 2,
            context: ["instagram.com"],
            description: "instagram-adapter-test",
            name: "instagram-adapter-test",
            title: "Instagram Adapter Test",
        });

        const moduleIndex = await contract.getModuleIndex("instagram-adapter-test");

        expect(await nftContract.totalSupply()).to.equal(1);
        expect(await nftContract.ownerOf(moduleIndex)).to.equal(dappletOwner.address);
        expect(await nftContract.balanceOf(dappletOwner.address)).to.equal(
            1
        );
    });

    it("should return twitter adapter owner by contextId after addModuleInfo", async () => {
        await addModuleInfo(contract, {});
        await contract.changeMyListing([
            ["H", "twitter-adapter-test"],
            ["twitter-adapter-test", "T"],
        ]);

        const moduleByTwitter =
            await contract.getModulesInfoByListersBatch(
                ["twitter.com"],
                [accountAddress],
                0
            );
        const resultDataByTwitter = moduleByTwitter.modules[0].map(getValues);
        expect(resultDataByTwitter).to.have.deep.members([
            {
                name: "twitter-adapter-test",
                title: "twitter-adapter-test",
                description: "twitter-adapter-test",
            },
        ]);
        expect(moduleByTwitter.owners[0]).to.eql([accountAddress]);
    });

    it("should transfer ownership of the module", async () => {
        const [_, dappletOwner, dappletBuyer] = await ethers.getSigners();
        const dappletOwnerToRegistry = await contract.connect(
            dappletOwner
        );

        await addModuleInfo(dappletOwnerToRegistry, {});
        const moduleIndex = await contract.getModuleIndex(
            "twitter-adapter-test"
        );

        const dappletOwnerToDNFT = await nftContract.connect(dappletOwner);
        await dappletOwnerToDNFT["safeTransferFrom(address,address,uint256)"](
            dappletOwner.address,
            dappletBuyer.address,
            moduleIndex
        );

        const modulesByOwner = await contract.getModulesByOwner(
            dappletBuyer.address,
            "default",
            0,
            10,
            false
        );
        const resultByOwner = modulesByOwner[0].map(getValues);

        expect(resultByOwner).to.eql([
            {
                name: "twitter-adapter-test",
                title: "twitter-adapter-test",
                description: "twitter-adapter-test",
            },
        ]);
    });

    it("gives NFT contract address", async () => {
        const address = await contract.getNftContractAddress();
        expect(nftContract.address).to.equal(address);
    });
});
