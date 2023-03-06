const fs = require("fs");
const path = require("path");
const { EMPTY_VERSION, convertToEthMi, convertToEthVi } = require("./helpers");

module.exports.importModules = async (contract) => {
    const outputDirPath = path.join(__dirname, "../output");
    const outputFilePath = path.join(outputDirPath, "export.json");
    if (!fs.existsSync(outputFilePath)) {
        console.log("No export.json file");
        return;
    }

    const json = fs.readFileSync(outputFilePath, { encoding: "utf-8" });
    const data = JSON.parse(json);

    for (const module of data.modules) {
        console.log(`${module.name}`);
        const mi = convertToEthMi(module);
        try {
            const tx = await contract.addModuleInfo(
                module.contextIds ?? [],
                [],
                mi,
                EMPTY_VERSION
            );
            await tx.wait();
        } catch (e) {
            if (e?.error?.message.indexOf("The module already exists") != -1) {
                console.log("The module already exists");
            } else {
                throw e;
            }
        }
        console.log("deployed");

        for (const version of module.versions) {
            console.log(`    ${version.version}`);
            const vi = convertToEthVi(version);
            try {
                const tx = await contract.addModuleVersion(module.name, vi);
                await tx.wait();
            } catch (e) {
                if (e?.error?.message.indexOf("Version already exists") != -1) {
                    console.log("Version already exists");
                } else {
                    throw e;
                }
            }
            console.log(`    deployed`);
        }
    }

    const listedModules =
        data.listers["0xaAF9E9Ce86D3f85ee15797B996c33eB720b185c0"];

    const links =
        listedModules.length > 0
            ? [
                  {
                      prev: "H",
                      next: listedModules[0],
                  },
                  ...listedModules.map((x, i) => ({
                      prev: x,
                      next:
                          i + 1 < listedModules.length
                              ? listedModules[i + 1]
                              : "T",
                  })),
              ]
            : [];

    await contract.changeMyListing(links);
    // console.log('changeMyListing', links);
    console.log(`added ${links.length} links`);

    return data;
};
