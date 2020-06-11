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
  "RESOLVER": 2, // It's adapter too
  "LIBRARY": 3,
  "INTERFACE": 4
};

const modulesOrder = [
  'common-lib.dapplet-base.eth',
  'dynamic-adapter.dapplet-base.eth',
  'common-adapter.dapplet-base.eth',
  'twitter-adapter.dapplet-base.eth',
  'dapplets-org-feature-1.dapplet-base.eth',
  'twitter-feature-1.dapplet-base.eth',
  'twitter-feature-2.dapplet-base.eth',
  'twitter-feature-3.dapplet-base.eth',
  'account-verify.dapplet-base.eth'
];

async function initModulesNew(registry) {
  const dumpByNames = _.groupBy(dump, x => x.name);

  const inputs = modulesOrder.map(name => {
    const manifests = dumpByNames[name];

    return ({
      contextId: moduleTags[name] || [],
      mInfo: {
        moduleType: moduleTypes[manifests[manifests.length - 1].type],
        name: manifests[manifests.length - 1].name,
        title: manifests[manifests.length - 1].title,
        description: manifests[manifests.length - 1].description,
        owner: "0x0000000000000000000000000000000000000000000000000000000000000000",
        interfaces: [],
        icon: {
          hash: manifests[manifests.length - 1].icon && manifests[manifests.length - 1].icon.hash || "0x0000000000000000000000000000000000000000000000000000000000000000",
          uris: manifests[manifests.length - 1].icon && manifests[manifests.length - 1].icon.uris.map(x => web3.utils.utf8ToHex(x)) || [],
        },
        flags: 0
      },
      vInfos: manifests.map(m => ({
        branch: m.branch,
        major: semver.major(m.version),
        minor: semver.minor(m.version),
        patch: semver.patch(m.version),
        flags: 0,
        binary: {
          hash: m.dist.hash,
          uris: m.dist.uris.map(x => web3.utils.utf8ToHex(x))
        },
        dependencies: m.dependencies && Object.entries(m.dependencies).map(([k, v]) => ({
          name: k, 
          branch: "default",
          major: semver.major(typeof v === 'string' ? v : v.default),
          minor: semver.minor(typeof v === 'string' ? v : v.default),
          patch: semver.patch(typeof v === 'string' ? v : v.default)
        })) || [],
        interfaces: []
      })),
      userId: "0x0000000000000000000000000000000000000000000000000000000000000000"
    })

  });

  let i = 0;
  for (const input of inputs) {
    let deployed = false;
    const chunks = _.chunk(input.vInfos, 25);
    let j = 0;
    for (const chunk of chunks) {
      if (!deployed) {
        console.log(`Deploying ModuleInfo: ${++i}/${inputs.length}`);
        await registry.addModuleInfo(input.contextId, input.mInfo, chunk, input.userId);
        deployed = true;
      } else {
        await registry.addModuleVersionBatch(chunk.map(() => input.mInfo.name), chunk, chunk.map(() => input.userId));
      }
      console.log(`    Version: ${++j}/${chunks.length}`);
    }
  }
}
