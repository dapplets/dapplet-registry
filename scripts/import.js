const fs = require("fs");
const path = require("path");
const semver = require("semver");

const PAGE_SIZE = 1;

const EMPTY_HASH_URIS = {
    hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    uris: [],
};

function convertStorageRefToEth(ref) {
    return (!ref) ? EMPTY_HASH_URIS : ref;
}

const EMPTY_VERSION = {
    branch: "",
    version: "0x00000000",
    binary: EMPTY_HASH_URIS,
    dependencies: [],
    interfaces: [],
    flags: "0x0",
    extensionVersion: "0x00000000",
    createdAt: "0x0"
};

function convertMiToEth(mi) {
    return {
        moduleType: mi.moduleType,
        name: mi.name,
        title: mi.title,
        description: mi.description,
        manifest: convertStorageRefToEth(mi.manifest),
        icon: convertStorageRefToEth(mi.icon),
        image: convertStorageRefToEth(mi.image),
        flags: mi.flags,
        interfaces: mi.interfaces ?? [],
    };
}

function convertViToEth(vi) {
    const toTwoDigits = (n) => {
        return n.length < 2 ? "0" + n : n.length > 2 ? "ff" : n;
    };

    const convertVersionToBytes = (x) => {
        return "0x" + 
        toTwoDigits(x.major.toString(16)) +
        toTwoDigits(x.minor.toString(16)) +
        toTwoDigits(x.patch.toString(16)) +
        (x.prerelease ? toTwoDigits(x.prerelease.toString(16)) : "ff");
    }

    return {
        branch: vi.branch,
        version: convertVersionToBytes(vi),
        binary: convertStorageRefToEth(vi.binary),
        dependencies: vi.dependencies.map(x => ({
            name: x.name,
            branch: x.branch,
            version: convertVersionToBytes(x),
        })),
        interfaces: vi.interfaces.map(x => ({
            name: x.name,
            branch: x.branch,
            version: convertVersionToBytes(x),
        })),
        flags: vi.flags,
        extensionVersion: vi.extensionVersion,
        createdAt: "0x0"
    };
}

task("import", "Import a state of the registry from JSON")
    .addParam("address", "The registry's address")
    .setAction(async (taskArgs) => {
        const outputDirPath = path.join(__dirname, "../output");
        const outputFilePath = path.join(outputDirPath, "export.json");
        if (!fs.existsSync(outputFilePath)) {
            console.log("No export.json file");
            return;
        }

        const json = fs.readFileSync(outputFilePath, { encoding: "utf-8" });
        const data = JSON.parse(json);

        const contract = await hre.ethers.getContractAt(
            "DappletRegistry",
            taskArgs.address
        );

        for (const module of data.modules) {
            console.log(`${module.name}`);
            const mi = convertMiToEth(module);
            try {
                const tx = await contract.addModuleInfo(module.contextIds ?? [], [], mi, EMPTY_VERSION);
                await tx.wait();
            } catch (e) {
                if (e?.error?.message.indexOf('The module already exists') != -1) {
                    console.log('The module already exists');
                } else {
                    throw e;
                }
            }
            console.log('deployed');

            for (const version of module.versions) {
                console.log(
                    `    ${version.branch}@${version.major}.${version.minor}.${version.patch}`
                );
                const vi = convertViToEth(version);
                try {
                    const tx = await contract.addModuleVersion(module.name, vi);
                    await tx.wait();
                } catch (e) {
                    if (e?.error?.message.indexOf('Version already exists') != -1) {
                        console.log('Version already exists');
                    } else {
                        throw e;
                    }
                }
                console.log(`    deployed`);
            }
        }

        const links =
            data.modules.length > 0
                ? [
                      {
                          prev: "H",
                          next: data.modules[0].name,
                      },
                      ...data.modules.map((x, i) => ({
                          prev: x.name,
                          next:
                              i + 1 < data.modules.length
                                  ? data.modules[i + 1].name
                                  : "T",
                      })),
                  ]
                : [];

        await contract.changeMyListing(links);
        // console.log('changeMyListing', links);
        console.log(`added ${links.length} links`)
    });
