const testData = require('../migrations/test_registry.json');

const DappletRegistry = artifacts.require("DappletRegistry");

contract('DappletRegistry', (accounts) => {
  it('should return uris by name#branch@version', async () => {
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

  it('should return modules by locations', async () => {
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
});
