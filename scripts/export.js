const fs = require("fs");
const path = require("path");

const PAGE_SIZE = 1;

function hex_to_ascii(str1) {
    var hex = str1.toString();
    var str = "";
    for (var n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
}

function convertHashUri(hashUri) {
    return hashUri.hash !==
        "0x0000000000000000000000000000000000000000000000000000000000000000"
        ? {
              hash: hashUri.hash,
              uris: hashUri.uris.map((x) => hex_to_ascii(x.replace("0x", ""))),
          }
        : null;
}

function convertBytes3Version(v) {
    return (
        parseInt(v[2] + v[3], 16) +
        "." +
        parseInt(v[4] + v[5], 16) +
        "." +
        parseInt(v[6] + v[7], 16)
    );
}

async function fetchModulesByBranch(contract, module, owner, branches) {
    const modules = [];

    const versions = [];

    for (const branch of branches) {
        const versionNumbersHex = await contract.getVersionNumbers(
            module.name,
            branch
        ); // ToDo: branch default is hardcoded
        const versionNumbers = (
            versionNumbersHex.replace("0x", "").match(/.{1,8}/g) ?? []
        ).map((x) => {
            const major = parseInt("0x" + x[0] + x[1]);
            const minor = parseInt("0x" + x[2] + x[3]);
            const patch = parseInt("0x" + x[4] + x[5]);
            return { major, minor, patch };
        });
    
        const _versions = await Promise.all(
            versionNumbers.map((x) =>
                contract.getVersionInfo(
                    module.name,
                    branch,
                    x.major,
                    x.minor,
                    x.patch
                )
            )
        );

        versions.push(..._versions);
    }

    const contextIds = await contract.getContextIdsByModule(module.name);

    const admins = await contract.getAdminsByModule(module.name);

    modules.push({
        moduleType: module.moduleType,
        name: module.name,
        title: module.title,
        description: module.description,
        fullDescription: convertHashUri(module.fullDescription),
        icon: convertHashUri(module.icon),
        interfaces: module.interfaces,
        flags: module.flags.toHexString(),
        owner: owner,
        versions: versions.map(({ dto, moduleType }) => ({
            branch: dto.branch,
            major: dto.major,
            minor: dto.minor,
            patch: dto.patch,
            binary: convertHashUri(dto.binary),
            dependencies: dto.dependencies.map((x) => ({
                name: x.name,
                branch: x.branch,
                major: x.major,
                minor: x.minor,
                patch: x.patch,
            })), // key of module
            interfaces: dto.interfaces.map((x) => ({
                name: x.name,
                branch: x.branch,
                major: x.major,
                minor: x.minor,
                patch: x.patch,
            })), //Exported interfaces. no duplicates.
            flags: dto.flags,
            extensionVersion: convertBytes3Version(dto.extensionVersion),
        })),
        contextIds: contextIds,
        admins: admins,
    });

    return modules;
}

task("export", "Exports a state of the registry into JSON")
    .addParam("address", "The registry's address")
    .setAction(async (taskArgs) => {
        const contract = await hre.ethers.getContractAt(
            "DappletRegistry",
            taskArgs.address
        );

        const modules = [];
        let offset = 0;

        while (true) {
            const response = await contract.getModules(offset, PAGE_SIZE);

            for (let i = 0; i < response.modules.length; i++) {
                const m = response.modules[i];
                const branches = ["default", "new", "legacy"];
                
                const _modules = await fetchModulesByBranch(
                    contract,
                    m,
                    response.owners[i],
                    branches
                );
                modules.push(..._modules);
            }

            if (modules.length >= Number(response.totalModules.toString())) {
                break;
            } else {
                offset = Number(response.nextOffset.toString());
            }
        }

        const listers = await contract.getListers();

        const modulesByListers = {};

        for (const lister of listers) {
            const modules = await contract.getModulesOfListing(lister);
            modulesByListers[lister] = modules;
        }

        const output = { modules, listers: modulesByListers };

        const outputDirPath = path.join(__dirname, "../output");
        const outputFilePath = path.join(outputDirPath, "export.json");
        if (!fs.existsSync(outputDirPath)) {
            fs.mkdirSync(outputDirPath, { recursive: true });
        }

        fs.writeFileSync(outputFilePath, JSON.stringify(output, null, 2), {
            encoding: "utf-8",
        });
    });
