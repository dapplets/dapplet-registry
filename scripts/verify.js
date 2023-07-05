async function main() {
    const ADDRESS = "0x275323706812aB038011C8E012EE97E34d2F4bD0";
    const ARGS = ["0x5A7bDA8A3c80b8C803B2DF345bea539DA938C1Bc"];
  
    console.log(`Verifying ${ADDRESS}...`);
    try {
      await hre.run("verify:verify", {
        address: ADDRESS,
        constructorArguments: ARGS,
      });
      console.log(`✅ ${ADDRESS} verified!`);
    } catch (error) {
      console.log(error);
    }
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });