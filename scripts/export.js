const fs = require("fs");
const path = require("path");
const {
    convertFromEthVi,
    convertFromEthMi,
    paginateAll,
} = require("../helpers/helpers");

const PAGE_SIZE = 10;

async function fetchModulesByBranch(contract, module, owner, branches) {
    const modules = [];
    const versions = [];

    for (const branch of branches) {
        const _versions = await paginateAll((offset, limit) => {
            console.log(
                `getVersionsByModule(${module.name}, ${branch}, ${offset}, ${limit}, true)`
            );
            return contract
                .getVersionsByModule(module.name, branch, offset, limit, false)
                .then(({ versions, total }) => ({
                    items: versions,
                    total: total.toNumber(),
                }));
        }, PAGE_SIZE);

        versions.push(
            ..._versions.map((x) =>
                convertFromEthVi(x, module.moduleType, {
                    name: module.name,
                    branch,
                })
            )
        );
    }

    const contextIds = await contract.getContextIdsByModule(module.name);
    const admins = await contract.getAdminsByModule(module.name);

    modules.push({
        ...convertFromEthMi(module),
        owner: owner,
        versions: versions,
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
            console.log(`getModules('default', ${offset}, ${PAGE_SIZE}, true)`);
            const response = await contract.getModules(
                "default",
                offset,
                PAGE_SIZE,
                false
            );

            for (let i = 0; i < response.modules.length; i++) {
                const m = response.modules[i];
                const owner = response.owners[i];

                console.log(`getBranchesByModule(${m.name})`);
                const branches = await contract.getBranchesByModule(m.name);
                const _modules = await fetchModulesByBranch(
                    contract,
                    m,
                    owner,
                    branches
                );
                modules.push(..._modules);
            }

            if (modules.length >= Number(response.total.toString())) {
                break;
            } else {
                offset += PAGE_SIZE;
            }
        }

        const listers = await paginateAll((offset, limit) => {
            console.log(`getListers(${offset}, ${limit})`);
            return contract
                .getListers(offset, limit)
                .then(({ listers, total }) => ({
                    items: listers,
                    total: total.toNumber(),
                }));
        }, PAGE_SIZE);

        const modulesByListers = {};

        for (const lister of listers) {
            const modules = await paginateAll((offset, limit) => {
                console.log(`getModulesOfListing(${offset}, ${limit})`);
                return contract.getModulesOfListing(lister, 'default', offset, limit, true)
                    .then(({ modules, total }) => ({
                        items: modules.map(x => x.name),
                        total: total.toNumber(),
                    }));
            }, PAGE_SIZE);
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
