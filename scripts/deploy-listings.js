async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const Listings = await ethers.getContractFactory("Listings");
  const contract = await Listings.deploy();

  console.log("Contract address:", contract.address);
  console.log("Delay 15 seconds to wait contract propagation.");

  await new Promise((r) => setTimeout(r, 15000));
  await hre.run("verify:verify", { address: contract.address });

  console.log("Verified on Etherscan");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });