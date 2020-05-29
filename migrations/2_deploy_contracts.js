const dump = require("./dump.json");

const DappletRegistry = artifacts.require("DappletRegistry");

const array_chunks = (array, chunk_size) => Array(Math.ceil(array.length / chunk_size)).fill().map((_, index) => index * chunk_size).map(begin => array.slice(begin, begin + chunk_size));

module.exports = function (deployer) {
  deployer.deploy(DappletRegistry)
    .then((instance) => initModules(instance))
    .then((instance) => initLocations(instance));
};

async function initModules(registry) {
  const modules = dump.map(d => ({
    name: d.name, branch: d.branch, version: d.version, manifest: {
      title: d.title,
      description: d.description,
      icon: d.icon || '', // ToDo: load to swarm
      mod_type: d.type,
      distHash: (d.dist.hash.indexOf('0x') !== 0) ? '0x' + d.dist.hash : d.dist.hash,
      distUris: d.dist.uris,
      dependencies: Object.entries(d.dependencies || {}).map(d => ([d[0], (typeof d[1] === 'string') ? d[1] : d[1]['default']]))
    }
  }))

  // const amountOfGas = await registry.addModules.estimateGas(modules, { gas: 100000000 });
  // const chunkSize = Math.ceil(modules.length / Math.ceil(amountOfGas / 5000000));
  const chunks = array_chunks(modules, 3);

  for (let i = 0; i < chunks.length; i++) {
    await registry.addModules(chunks[i]);
    console.log(`Deployed ${i + 1} / ${chunks.length} chunks of modules.`);
  }

  return registry;
}

async function initLocations(registry) {
  const locationsRaw = [...new Set(dump.map(item => item.name))].map(name => ({ moduleName: name, locations: dump.find(d => d.name === name).locations}));
  const locations = [].concat(...locationsRaw.map(x => x.locations.map(l => ({ moduleName: x.moduleName, location: l}))));


  const amountOfGas = await registry.addLocations.estimateGas(locations, { gas: 100000000 });
  const chunkSize = Math.ceil(locations.length / Math.ceil(amountOfGas / 5000000));
  const chunks = array_chunks(locations, chunkSize);

  for (let i = 0; i < chunks.length; i++) {
    await registry.addLocations(chunks[i]);
    console.log(`Deployed ${i + 1} / ${chunks.length} chunks of locations.`);
  }

  return registry;
}