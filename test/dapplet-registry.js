const { use, expect } = require("chai");
const { ethers } = require("hardhat");
const assertArrays = require("chai-arrays");
const chaiAsPromised = require("chai-as-promised");
const addModuleInfo = require("../helpers/addModuleInfo");
const { convertToEthMi, convertToEthVi } = require("../helpers/convert");
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

    beforeEach(async function () {
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
            deployDappletNFT.address
        );
        await deployDappletRegistry.deployed();
        contract = deployDappletRegistry;

        await deployDappletNFT.transferOwnership(contract.address);

        nftContract = deployDappletNFT;
    });

    it("The contract is being deposited", async function () {
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

        const uri = await nftContract.tokenURI(1);
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

        const page_1 = await contract.getModules("default", 0, 10, false);
        expect(page_1.modules.map((x) => x.name)).deep.eq(
            [...names].splice(0, 10)
        );

        const page_2 = await contract.getModules("default", 10, 10, false);
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
            false
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
            convertToEthVi({ version: "0x000100ff" })
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
            })
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
                convertToEthVi({})
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

        console.log(
            response.modules[0].map((x) => x.name),
            response.owners
        );
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
            acc1
        );
        const DappletNFT = await ethers.getContractFactory("DappletNFT", acc1);

        const deployDappletNFT = await DappletNFT.deploy();
        const libDappletRegistryRead = await LibDappletRegistryRead.deploy();

        await deployDappletNFT.deployed();
        await libDappletRegistryRead.deployed();

        dappletContract = deployDappletNFT;

        const DappletRegistry = await ethers.getContractFactory(
            "DappletRegistry",
            {
                signer: acc1,
                libraries: {
                    LibDappletRegistryRead: libDappletRegistryRead.address,
                },
            }
        );
        const deployDappletRegistry = await DappletRegistry.deploy(
            dappletContract.address
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
        expect(await dappletContract.balanceOf(dappletOwnerAddress)).to.equal(
            0
        );

        await addModuleInfo(buyerAccount, {
            moduleType: 2,
            context: ["instagram.com"],
            description: "instagram-adapter-test",
            name: "instagram-adapter-test",
            title: "Instagram Adapter Test",
        });

        expect(await dappletContract.totalSupply()).to.equal(1);
        expect(await dappletContract.ownerOf(1)).to.equal(dappletOwnerAddress);
        expect(await dappletContract.balanceOf(dappletOwnerAddress)).to.equal(
            1
        );
    });

    it("should return twitter adapter owner by contextId after addModuleInfo", async () => {
        await addModuleInfo(registryContract, {});
        await registryContract.changeMyListing([
            ["H", "twitter-adapter-test"],
            ["twitter-adapter-test", "T"],
        ]);

        const moduleByTwitter =
            await registryContract.getModulesInfoByListersBatch(
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
        const dappletOwnerToRegistry = await registryContract.connect(
            dappletOwner
        );

        await addModuleInfo(dappletOwnerToRegistry, {});
        const moduleIndex = await registryContract.getModuleIndex(
            "twitter-adapter-test"
        );

        const dappletOwnerToDNFT = await dappletContract.connect(dappletOwner);
        await dappletOwnerToDNFT["safeTransferFrom(address,address,uint256)"](
            dappletOwnerAddress,
            dappletBuyer.address,
            moduleIndex
        );

        const modulesByOwner = await registryContract.getModulesByOwner(
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
        const address = await registryContract.getNftContractAddress();
        expect(dappletContract.address).to.equal(address);
    });
});
