task("import-module", "")
    .addParam("address", "The registry's address")
    .setAction(async (taskArgs) => {
        console.log('start')
        const contract = await hre.ethers.getContractAt(
            "DappletRegistry",
            taskArgs.address
        );

        await contract.addModuleInfo(
            [],
            [],
            {
                moduleType: 1,
                name: "connected-accounts",
                title: "Connected Accounts",
                description: "This dapplet allows you to link your accounts using the Connected Accounts service",
                fullDescription: {
                    hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
                    uris: [],
                },
                interfaces: [],
                icon: {
                    hash: "0xa4e7276f2d161a820266adcc3dff5deaeb1845015b4c07fe2667068349578968",
                    uris: [],
                },
                flags: 0,
            },
            []
        );
    });
