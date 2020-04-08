const testData = require('../migrations/test_registry.json');

const DappletRegistry = artifacts.require("DappletRegistry");

contract('DappletRegistry', (accounts) => {
  xit('should return uris by name#branch@version', async () => {
    const DappletRegistryInstance = await DappletRegistry.deployed();

    for (const name in testData.modules) {
      for (const branch in testData.modules[name]) {
        for (const version in testData.modules[name][branch]) {
          const expectedUris = testData.modules[name][branch][version];
          const uris = await DappletRegistryInstance.resolveToUri(name, branch, version);
          expect(expectedUris).to.eql(uris);
        }
      }
    }
  });

  xit('should return modules by locations', async () => {
    const DappletRegistryInstance = await DappletRegistry.deployed();

    for (const location in testData.hostnames) {
      const modules = await DappletRegistryInstance.getModules(location);
      assert.isArray(modules);

      for (const name in testData.hostnames[location]) {
        for (const branch of testData.hostnames[location][name]) {
          const module = [name, branch];
          assert.deepInclude(modules, module);
        }
      }
    }
  });


  it('playing', async () => {
    const DappletRegistryInstance = await DappletRegistry.deployed();

    // ToDo: it's possible to set gas limit for transaction with last parameter
    // Read more: https://www.trufflesuite.com/docs/truffle/getting-started/interacting-with-your-contracts#making-a-transaction

    // ToDo: how to get here a transaction receipt?
    // Read more: https://www.trufflesuite.com/docs/truffle/getting-started/interacting-with-your-contracts#special-methods-on-truffle-contract-objects
    const sum = await DappletRegistryInstance.sum();

  });
  xit('getAllModules', async () => {
    const DappletRegistryInstance = await DappletRegistry.deployed();
    const modules = await DappletRegistryInstance.getAllModules('twitter.com');
    console.log(modules);
  });

  it('resolve to uris', async () => {
    const DappletRegistryInstance = await DappletRegistry.deployed();
    const uris = await DappletRegistryInstance.resolveToUri('test', 'test', 'test', { gas: 100000000000000 });
    console.log(uris.length);
  });



  for (let i = 1; i <= 1000000; i = i * 2) {
    xit(`generate output ${i}`, async function () {
      this.timeout(60 * 1000);
      const DappletRegistryInstance = await DappletRegistry.deployed();
      const uris = await DappletRegistryInstance.generateOutput(i, { gas: 100000000000000 });
      assert.equal(uris.length, i);
    });
  }
});
