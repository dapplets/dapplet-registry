/**
 *
 * @param {*} contract
 * @param {
 *  Object
 *  @param {title} title
 *  @param {description} description
 *  @param {name} name
 *  @param {accountAddress}
 *   accountAddress the address of the module creator. Only he can get all the models at
 *  @param {context} context array of contexts where the module can work
 *  @param {interfaces} interfaces ??
 *  @param {moduleType} moduleType number
 *
 * }
 */
module.exports = addModuleInfo = async (
  contract,
  {
    title = "twitter-adapter-test",
    description = "twitter-adapter-test",
    nftImage = "ipfs://deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    name = "twitter-adapter-test",
    context = ["twitter.com"],
    interfaces = ["identity-adapter-test"],
    moduleType = 2,
  },
  versions = undefined
) => {
  await contract.addModuleInfo(
    context,
    [], // links
    {
      moduleType, // adapter
      name,
      title,
      description,
      nftImage,
      fullDescription: {
        hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        uris: [
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ],
      },
      interfaces,
      icon: {
        hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        uris: [
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ],
      },
      flags: 0,
    },
    versions === undefined ? [
      {
        branch: "default",
        version: "0x00010000",
        flags: 0,
        binary: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          uris: [
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          ],
        },
        dependencies: [],
        interfaces: [],
        extensionVersion: "0x00ff0100",
        createdAt: 0
      },
    ] : versions,
  );
};
