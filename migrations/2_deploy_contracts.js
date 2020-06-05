const dump = require("./dump.json");
const web3 = require("web3");
const _ = require('lodash');
const semver = require('semver')

const DappletRegistry = artifacts.require("DappletRegistry");

const array_chunks = (array, chunk_size) => Array(Math.ceil(array.length / chunk_size)).fill().map((_, index) => index * chunk_size).map(begin => array.slice(begin, begin + chunk_size));

module.exports = function (deployer) {
  deployer.deploy(DappletRegistry)
    .then((instance) => initModulesNew(instance))
  //.then((instance) => initModules(instance))
  //.then((instance) => initLocations(instance));
};

const moduleTags = {
  'common-adapter.dapplet-base.eth': [],
  'common-lib.dapplet-base.eth': [],
  'dapplets-org-feature-1.dapplet-base.eth': [],
  'dynamic-adapter.dapplet-base.eth': [],
  "twitter-adapter.dapplet-base.eth": ["twitter.com", "www.twitter.com", "mobile.twitter.com"],
  'twitter-feature-1.dapplet-base.eth': ["twitter-adapter.dapplet-base.eth"],
  'twitter-feature-2.dapplet-base.eth': ["twitter-adapter.dapplet-base.eth"],
  'twitter-feature-3.dapplet-base.eth': ["twitter-adapter.dapplet-base.eth"],
  'account-verify.dapplet-base.eth': ["twitter-adapter.dapplet-base.eth"]
};

const moduleTypes = {
  "FEATURE": 1,
  "ADAPTER": 2,
  "RESOLVER": 3,
  "LIBRARY": 4,
  "INTERFACE": 5
};

async function initModulesNew(registry) {
  const dumpByNames = _.groupBy(dump, x => x.name);

  const inputs = Object.entries(dumpByNames).map(([name, manifests]) => {

    console.log(moduleTypes[manifests[manifests.length - 1].type]);
    
    return ({
    contextId: moduleTags[name] || [],
    mInfo: {
      moduleType: moduleTypes[manifests[manifests.length - 1].type],
      name: manifests[manifests.length - 1].name,
      title: manifests[manifests.length - 1].title,
      description: manifests[manifests.length - 1].description,
      owner: "0x0000000000000000000000000000000000000000000000000000000000000000",
      versions: manifests.map(m => ({
        branch: m.branch,
        major: semver.major(m.version),
        minor: semver.minor(m.version),
        patch: semver.patch(m.version),
        flags: 0,
        binary: {
          hash: m.dist.hash,
          uris: m.dist.uris.map(x => web3.utils.utf8ToHex(x))
        },
        dependencies: [],
        interfaces: []
      })),
      interfaces: [],
      icon: {
        hash: manifests[manifests.length - 1].icon && manifests[manifests.length - 1].icon.hash || "0x0000000000000000000000000000000000000000000000000000000000000000",
        uris: manifests[manifests.length - 1].icon && manifests[manifests.length - 1].icon.uris.map(x => web3.utils.utf8ToHex(x)) || [],
      },
      flags: 0
    },
    userId: "0x0000000000000000000000000000000000000000000000000000000000000000"
  })
  
});

  let i = 0;
  for (const input of inputs) {
    console.log(`Deploying ${++i}/${inputs.length}`);
    await registry.addModuleInfo(input.contextId, input.mInfo, input.userId);
  }
}

async function initModules(registry) {
  const modules = dump.map(d => ({
    name: d.name, branch: d.branch, version: d.version, manifest: {
      name: d.name,
      branch: d.branch,
      version: d.version,
      title: d.title,
      author: d.author,
      description: d.description,
      icon: d.icon || '', // ToDo: load to swarm
      mod_type: d.type,
      distHash: (d.dist.hash.indexOf('0x') !== 0) ? '0x' + d.dist.hash : d.dist.hash,
      distUris: d.dist.uris,
      iconHash: (d.icon) ? ((d.icon.hash.indexOf('0x') !== 0) ? '0x' + d.icon.hash : d.icon.hash) : '0x0000000000000000000000000000000000000000000000000000000000000000',
      iconUris: d.icon ? d.icon.uris : [],
      dependencies: Object.entries(d.dependencies || {}).map(d => ([d[0], (typeof d[1] === 'string') ? d[1] : d[1]['default']]))
    }
  }))

  // const amountOfGas = await registry.addModules.estimateGas(modules, { gas: 100000000 });
  // const chunkSize = Math.ceil(modules.length / Math.ceil(amountOfGas / 5000000));
  const chunks = array_chunks(modules, 10);

  for (let i = 0; i < chunks.length; i++) {
    await registry.addModules(chunks[i]);
    console.log(`Deployed ${i + 1} / ${chunks.length} chunks of modules.`);
  }

  return registry;
}

async function initLocations(registry) {
  const locationsRaw = [...new Set(dump.map(item => item.name))].map(name => ({ moduleName: name, locations: dump.find(d => d.name === name).locations }));
  const locations = [].concat(...locationsRaw.map(x => x.locations.map(l => ({ moduleName: x.moduleName, location: l }))));


  const amountOfGas = await registry.addLocations.estimateGas(locations, { gas: 100000000 });
  const chunkSize = Math.ceil(locations.length / Math.ceil(amountOfGas / 5000000));
  const chunks = array_chunks(locations, chunkSize);

  for (let i = 0; i < chunks.length; i++) {
    await registry.addLocations(chunks[i]);
    console.log(`Deployed ${i + 1} / ${chunks.length} chunks of locations.`);
  }

  return registry;
}