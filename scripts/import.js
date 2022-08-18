const fs = require("fs");
const path = require("path");
const semver = require("semver");

const PAGE_SIZE = 1;

function convertStorageRefToEth(ref) {
    return ref === null
        ? {
              hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
              uris: [],
          }
        : {
              hash: ref.hash,
              uris: ref.uris.map((x) =>
                  hre.ethers.utils.hexlify(hre.ethers.utils.toUtf8Bytes(x))
              ),
          };
}

function convertMiToEth(mi) {
    return {
        moduleType: mi.moduleType,
        name: mi.name,
        title: mi.title,
        description: mi.description,
        fullDescription: convertStorageRefToEth(mi.fullDescription),
        icon: convertStorageRefToEth(mi.icon),
        flags: mi.flags,
        interfaces: mi.interfaces,
    };
}

function convertViToEth(vi) {
    const toTwoDigits = (n) => {
        return n.length < 2 ? "0" + n : n.length > 2 ? "ff" : n;
    };

    return {
        branch: vi.branch,
        major: vi.major,
        minor: vi.minor,
        patch: vi.patch,
        binary: convertStorageRefToEth(vi.binary),
        dependencies: vi.dependencies,
        interfaces: vi.interfaces,
        flags: vi.flags,
        extensionVersion: !vi.extensionVersion
            ? "0x000000"
            : "0x" +
              toTwoDigits(semver.major(vi.extensionVersion).toString(16)) +
              toTwoDigits(semver.minor(vi.extensionVersion).toString(16)) +
              toTwoDigits(semver.patch(vi.extensionVersion).toString(16)),
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
            const mi = convertMiToEth(module);
            await contract.addModuleInfo(module.contextIds, [], mi, []);
            console.log(`${mi.name}`);

            for (const version of module.versions) {
                const vi = convertViToEth(version);
                await contract.addModuleVersion(module.name, vi);
                console.log(
                    `    ${vi.branch}@${vi.major}.${vi.minor}.${vi.patch}`
                );
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
        console.log(`added ${links.length} links`)
    });
