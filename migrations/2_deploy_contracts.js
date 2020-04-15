const testData = require("./test_registry.json");

const DappletRegistry = artifacts.require("DappletRegistry");

const array_chunks = (array, chunk_size) => Array(Math.ceil(array.length / chunk_size)).fill().map((_, index) => index * chunk_size).map(begin => array.slice(begin, begin + chunk_size));

module.exports = function (deployer) {
  deployer.deploy(DappletRegistry)
    .then((instance) => initModules(instance))
    .then((instance) => initLocations(instance));
};

async function initModules(registry) {
  const modules = [];

  for (const name in testData.modules) {
    for (const branch in testData.modules[name]) {
      for (const version in testData.modules[name][branch]) {
        const uris = testData.modules[name][branch][version];
        for (const uri of uris) {
          modules.push({ name, branch, version, uri });
        }
      }
    }
  }

  const amountOfGas = await registry.addModules.estimateGas(modules, { gas: 100000000 });
  const chunkSize = Math.ceil(modules.length / Math.ceil(amountOfGas / 5000000));
  const chunks = array_chunks(modules, chunkSize);

  for (let i = 0; i < chunks.length; i++) {
    await registry.addModules(chunks[i]);
    console.log(`Deployed ${i + 1} / ${chunks.length} chunks of modules.`);
  }

  return registry;
}

async function initLocations(registry) {
  const locations = [];

  for (const location in testData.hostnames) {
    for (const name in testData.hostnames[location]) {
      for (const branch of testData.hostnames[location][name]) {
        locations.push({ name, branch, location });
      }
    }
  }

  const amountOfGas = await registry.addLocations.estimateGas(locations, { gas: 100000000 });
  const chunkSize = Math.ceil(locations.length / Math.ceil(amountOfGas / 5000000));
  const chunks = array_chunks(locations, chunkSize);

  for (let i = 0; i < chunks.length; i++) {
    await registry.addLocations(chunks[i]);
    console.log(`Deployed ${i + 1} / ${chunks.length} chunks of locations.`);
  }

  return registry;
}