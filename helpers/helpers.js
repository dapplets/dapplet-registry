const ethers = require("ethers");
const semver = require("semver");

const moduleTypesMap = {
    1: "Feature",
    2: "Adapter",
    3: "Library",
    4: "Interface",
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_BYTES32 =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

const EMPTY_STORAGE_REF = {
    hash: ZERO_BYTES32,
    uris: [],
};

const EMPTY_VERSION = {
    branch: "",
    version: "0x00000000",
    binary: EMPTY_STORAGE_REF,
    dependencies: [],
    interfaces: [],
    flags: 0,
    extensionVersion: "0x00000000",
    createdAt: ethers.BigNumber.from(0),
};

function convertFromEthMi(m) {
    const mi = {};
    mi.type = moduleTypesMap[m.moduleType];
    mi.name = m.name;
    mi.title = m.title;
    mi.description = m.description;
    mi.author = m.owner;
    mi.image = convertFromEthStorageRef(m.image);
    mi.metadata = convertFromEthStorageRef(m.manifest);
    mi.icon = convertFromEthStorageRef(m.icon);
    mi.interfaces = m.interfaces;
    mi.isUnderConstruction = getBitFromHex(m.flags.toHexString(), 0);
    return mi;
}

function convertFromEthVi(dto, moduleType, { name, branch }) {
    const vi = {};
    vi.name = name;
    vi.branch = branch;
    vi.version = convertFromEthVersion(dto.version);
    vi.type = moduleTypesMap[moduleType];
    vi.dist = convertFromEthStorageRef(dto.binary);
    vi.dependencies = Object.fromEntries(
        dto.dependencies.map((d) => [d.name, convertFromEthVersion(d.version)])
    );
    vi.interfaces = Object.fromEntries(
        dto.interfaces.map((d) => [d.name, convertFromEthVersion(d.version)])
    );
    vi.extensionVersion = convertFromEthVersion(dto.extensionVersion);
    vi.createdAt = convertTimestampToISODate(dto.createdAt.toNumber() * 1000);
    return vi;
}

function convertToEthMi(module) {
    return {
        name: module.name,
        moduleType: parseInt(
            Object.entries(moduleTypesMap).find(([, v]) => v === module.type)[0]
        ),
        flags: ethers.BigNumber.from("0x00"),
        title: module.title,
        image: module.image ?? EMPTY_STORAGE_REF,
        description: module.description,
        manifest: module.metadata ?? EMPTY_STORAGE_REF,
        icon: module.icon ?? EMPTY_STORAGE_REF,
        owner: ZERO_ADDRESS,
        interfaces: module.interfaces || [],
    };
}

function convertToEthVi(version) {
    const convertDependencies = (dependencies) => {
        return (
            (dependencies &&
                Object.entries(dependencies).map(([k, v]) => ({
                    name: k,
                    branch: "default",
                    version: convertToEthVersion(
                        typeof v === "string" ? v : v[DEFAULT_BRANCH_NAME]
                    ),
                }))) ||
            []
        );
    };

    return {
        branch: version.branch,
        version: convertToEthVersion(version.version),
        binary: version.dist ?? EMPTY_STORAGE_REF,
        dependencies: convertDependencies(version.dependencies),
        interfaces: convertDependencies(version.interfaces),
        flags: 0,
        extensionVersion: convertToEthVersion(version.extensionVersion),
        createdAt: ethers.BigNumber.from(
            convertISODateToTimestamp(version.createdAt)
        ),
    };
}

function convertFromEthVersion(hex) {
    if (hex.length != 10) throw new Error("Invalid hex of version");
    const major = parseInt(hex.substr(2, 2), 16);
    const minor = parseInt(hex.substr(4, 2), 16);
    const patch = parseInt(hex.substr(6, 2), 16);
    const pre = parseInt(hex.substr(8, 2), 16);
    return `${major}.${minor}.${patch}` + (pre !== 255 ? `-pre.${pre}` : "");
}

function convertToEthVersion(version) {
    if (!version) return "0x000000ff";

    const toTwoDigits = (n) => {
        return n.length < 2 ? "0" + n : n.length > 2 ? "ff" : n;
    };

    return (
        "0x" +
        toTwoDigits(semver.major(version).toString(16)) +
        toTwoDigits(semver.minor(version).toString(16)) +
        toTwoDigits(semver.patch(version).toString(16)) +
        toTwoDigits(semver.prerelease(version)?.[1].toString(16) ?? "ff")
    );
}

function convertFromEthStorageRef(storageRef) {
    return storageRef.hash === ZERO_BYTES32
        ? null
        : {
              hash: storageRef.hash,
              uris: storageRef.uris,
          };
}

function convertTimestampToISODate(timestamp) {
    return new Date(timestamp).toISOString();
}

function convertISODateToTimestamp(isoDate) {
    return new Date(isoDate).getTime() / 1000;
}

function getBitFromHex(hex, bitnumber) {
    return convertHexToBinary(hex).split("").reverse()[bitnumber] === "1";
}

async function paginateAll(callback, pageSize) {
    const out = [];
    let total = null;

    for (let i = 0; total === null || i < total; i = i + pageSize) {
        const { items, total: _total } = await callback(i, pageSize);
        out.push(...items);
        total = _total;
    }

    return out;
}

/**
 * Converts hex-string to binary-string. Big numbers resistance.
 */
function convertHexToBinary(hex) {
    hex = hex.replace("0x", "").toLowerCase();
    let out = "";
    for (const c of hex) {
        switch (c) {
            case "0":
                out += "0000";
                break;
            case "1":
                out += "0001";
                break;
            case "2":
                out += "0010";
                break;
            case "3":
                out += "0011";
                break;
            case "4":
                out += "0100";
                break;
            case "5":
                out += "0101";
                break;
            case "6":
                out += "0110";
                break;
            case "7":
                out += "0111";
                break;
            case "8":
                out += "1000";
                break;
            case "9":
                out += "1001";
                break;
            case "a":
                out += "1010";
                break;
            case "b":
                out += "1011";
                break;
            case "c":
                out += "1100";
                break;
            case "d":
                out += "1101";
                break;
            case "e":
                out += "1110";
                break;
            case "f":
                out += "1111";
                break;
            default:
                return "";
        }
    }
    return hex;
}

module.exports.convertFromEthMi = convertFromEthMi;
module.exports.convertFromEthVi = convertFromEthVi;
module.exports.convertToEthMi = convertToEthMi;
module.exports.convertToEthVi = convertToEthVi;
module.exports.convertFromEthVersion = convertFromEthVersion;
module.exports.convertToEthVersion = convertToEthVersion;
module.exports.convertFromEthStorageRef = convertFromEthStorageRef;
module.exports.convertTimestampToISODate = convertTimestampToISODate;
module.exports.convertISODateToTimestamp = convertISODateToTimestamp;
module.exports.getBitFromHex = getBitFromHex;
module.exports.paginateAll = paginateAll;
module.exports.EMPTY_VERSION = EMPTY_VERSION;