async function main() {
  const ADDRESS = "0x194a500Cbe0369Ad916E4CDc85572BF0810Ba676";
  const ARGS = ["0xDAad79C85E5b2EAd8E9903CAeEEd9E76CCc95bc6", "0xdc3e16daa295e1e066283146d067040725cc5475"];

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
