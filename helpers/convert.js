const EMPTY_REF = {
    hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
    uris: [],
};

module.exports.convertToEthMi = (m) => {
    const defaultMi = {
        moduleType: 1,
        name: "module",
        title: "Test Module",
        description: "Description of the module",
        image: EMPTY_REF,
        manifest: EMPTY_REF,
        interfaces: [],
        icon: EMPTY_REF,
        flags: 0,
    };

    return Object.assign(defaultMi, m);
};

module.exports.convertToEthVi = (v) => {
    const defaultVi = {
        branch: "default",
        version: "0x00010000",
        flags: 0,
        binary: EMPTY_REF,
        dependencies: [],
        interfaces: [],
        extensionVersion: "0x00ff0100",
        createdAt: 0,
    };

    return Object.assign(defaultVi, v);
};
