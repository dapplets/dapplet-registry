const testData = require('../migrations/test_registry.json');

const DappletRegistry = artifacts.require("DappletRegistry");

contract('DappletRegistry', (accounts) => {

  it('should return modules by contextId', async () => {
    const contract = await DappletRegistry.deployed();
    const moduleInfo = await contract.getModuleInfo("twitter.com", ["0x000000000000000000000000" + accounts[0].replace('0x', '')], 0);
    assert.isArray(moduleInfo);
    console.log(moduleInfo.map(m => m.name));
  });

  it('should return module names by contextId', async () => {
    const contract = await DappletRegistry.deployed();
    const names = await contract.getModules("twitter.com", ["0x000000000000000000000000" + accounts[0].replace('0x', '')], 0);
    assert.isArray(names);
    console.log(names);
  });

  it('should return module versions by name+branch', async () => {
    const contract = await DappletRegistry.deployed();
    const versions = await contract.getVersions("twitter-feature-1.dapplet-base.eth", "default");
    assert.isArray(versions);
    console.log(versions);
  });

  it('should return versionInfo by name+branch+version', async () => {
    const contract = await DappletRegistry.deployed();
    const versionInfo = await contract.resolveToManifest("twitter-feature-1.dapplet-base.eth", "default", { major: 0, minor: 3, patch: 8 });
    console.log(versionInfo);
  });

  it('should add virtual adapter and return features', async () => {
    const contract = await DappletRegistry.deployed();

    // add adapter
    await contract.addModuleInfo(
      ['instagram.com'],
      {
        moduleType: 2, // adapter
        name: 'instagram-adapter-test',
        title: 'instagram-adapter-test',
        description: 'instagram-adapter-test',
        owner: "0x0000000000000000000000000000000000000000000000000000000000000000",
        versions: [{
          branch: 'default',
          major: 0,
          minor: 0,
          patch: 1,
          flags: 0,
          binary: {
            hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
            uris: ['0x0000000000000000000000000000000000000000000000000000000000000000']
          },
          dependencies: [],
          interfaces: []
        }],
        interfaces: ['identity-adapter-test'],
        icon: {
          hash: '0x0000000000000000000000000000000000000000000000000000000000000001',
          uris: ['0x0000000000000000000000000000000000000000000000000000000000000000'],
        },
        flags: 0
      },
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );

    // add adapter
    await contract.addModuleInfo(
      ['twitter.com'],
      {
        moduleType: 2, // adapter
        name: 'twitter-adapter-test',
        title: 'twitter-adapter-test',
        description: 'twitter-adapter-test',
        owner: "0x0000000000000000000000000000000000000000000000000000000000000000",
        versions: [{
          branch: 'default',
          major: 0,
          minor: 0,
          patch: 1,
          flags: 0,
          binary: {
            hash: '0x0000000000000000000000000000000000000000000000000000000000000002',
            uris: ['0x0000000000000000000000000000000000000000000000000000000000000000']
          },
          dependencies: [],
          interfaces: []
        }],
        interfaces: ['identity-adapter-test'],
        icon: {
          hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          uris: ['0x0000000000000000000000000000000000000000000000000000000000000000'],
        },
        flags: 0
      },
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );

    //add feature
    await contract.addModuleInfo(
      ['identity-adapter-test'],
      {
        moduleType: 1, // feature
        name: 'identity-feature-test',
        title: 'identity-feature-test',
        description: 'identity-feature-test',
        owner: "0x0000000000000000000000000000000000000000000000000000000000000000",
        versions: [{
          branch: 'default',
          major: 0,
          minor: 0,
          patch: 1,
          flags: 0,
          binary: {
            hash: '0x0000000000000000000000000000000000000000000000000000000000000003',
            uris: ['0x0000000000000000000000000000000000000000000000000000000000000000']
          },
          dependencies: [],
          interfaces: []
        }],
        interfaces: [],
        icon: {
          hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          uris: ['0x0000000000000000000000000000000000000000000000000000000000000000'],
        },
        flags: 0
      },
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );


    // ToDo: check 0x binary hash
    // ToDo: check existance of binary hash
    // ToDo: check feature can not implement interfaces

    const moduleInfo = await contract.getModuleInfo("twitter.com", ["0x000000000000000000000000" + accounts[0].replace('0x', '')], 0);
    assert.isArray(moduleInfo);
    console.log(moduleInfo.map(m => m.name));

    const moduleInfo2 = await contract.getModuleInfo("instagram.com", ["0x000000000000000000000000" + accounts[0].replace('0x', '')], 0);
    assert.isArray(moduleInfo2);
    console.log(moduleInfo2.map(m => m.name));

  });
});
