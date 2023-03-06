const { importModules } = require("../helpers/import");

task("import", "Import a state of the registry from JSON")
    .addParam("address", "The registry's address")
    .setAction(async (taskArgs) => {
        const contract = await hre.ethers.getContractAt(
            "DappletRegistry",
            taskArgs.address
        );

        await importModules(contract);
    });
