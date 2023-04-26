const STAKING_TOKEN = "0x0000000000000000000000000000000000000000";

async function main() {
  const [deployer] = await ethers.getSigners();

  let contracts = [];

  let dappletNFT;
  let libRegistryRead;
  let dappletRegistry;

  dappletNFT = await deploy("DappletNFT", []);
  contracts.push(dappletNFT);

  libRegistryRead = await deploy("LibDappletRegistryRead");
  contracts.push(libRegistryRead);

  libRegistryReadExt = await deploy("LibDappletRegistryReadExt");
  contracts.push(libRegistryReadExt);

  dappletRegistry = await deploy(
    "DappletRegistry",
    [dappletNFT.address, STAKING_TOKEN],
    {},
    {
      LibDappletRegistryRead: libRegistryRead.address,
      LibDappletRegistryReadExt: libRegistryReadExt.address,
    },
  );

  contracts.push(dappletRegistry);

  console.log("dappletNFT transferOwnership");

  await dappletNFT.contract.transferOwnership(dappletRegistry.address);

  console.table([
    { Contract: "DappletNFT", Address: dappletNFT.address },
    { Contract: "LibDappletRegistryRead", Address: libRegistryRead.address },
    { Contract: "LibDappletRegistryReadExt", Address: libRegistryReadExt.address },
    { Contract: "DappletRegistry", Address: dappletRegistry.address },
  ]);

  await Promise.all(
    contracts.map(async (contract) => {
      console.log(`Verifying ${contract.name}...`);
      try {
        await hre.run("verify:verify", {
          address: contract.address,
          constructorArguments: contract.args,
        });
        console.log(`✅ ${contract.name} verified!`);
      } catch (error) {
        console.log(error);
      }
    }),
  );
}

async function deploy(
  contractName,
  _args = [],
  overrides = {},
  libraries = {},
) {
  console.log(` 🛰  Deploying: ${contractName}`);

  const contractArgs = _args || [];
  const contractArtifacts = await ethers.getContractFactory(contractName, {
    libraries: libraries,
  });
  const contract = await contractArtifacts.deploy(...contractArgs, overrides);
  const contractAddress = contract.address;

  await contract.deployed();

  const deployed = {
    name: contractName,
    address: contractAddress,
    args: contractArgs,
    contract,
  };

  return deployed;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
