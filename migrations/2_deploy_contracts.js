const testData = require("./test_registry.json");

const HelpersLib = artifacts.require("HelpersLib");
const DappletRegistry = artifacts.require("DappletRegistry");

module.exports = function (deployer) {
  deployer.deploy(HelpersLib);
  deployer.link(HelpersLib, DappletRegistry);
  deployer.deploy(DappletRegistry).then((instance) => {
    // ToDo: add 1000 modules to registry
    return dataInit(instance);
  });
};

async function dataInit(registry) {
  // modules import
  for (const name in testData.modules) {
    for (const branch in testData.modules[name]) {
      for (const version in testData.modules[name][branch]) {
        const uris = testData.modules[name][branch][version];
        for (const uri of uris) {
          await registry.addModule(name, branch, version, uri);
          console.log(`${name}#${branch}@${version} deployed with uri ${uri}`);
        }
      }
    }
  }

  // locations import
  for (const location in testData.hostnames) {
    for (const name in testData.hostnames[location]) {
      for (const branch of testData.hostnames[location][name]) {
        await registry.addLocation(name, branch, location);
        console.log(`${name}#${branch} binded to ${location}`);
      }
    }
  }
}