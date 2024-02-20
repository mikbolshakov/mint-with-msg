const testTokenAbi = require( "./abi.json");
const ethers = require("ethers");

const joinSignature = require("ethers/lib/utils");
const TypedDataUtils = require("ethers-eip712");

// npx ts-node scripts/mintTx.ts
const contractAddress = "0x2E969B863AD66a00524189A02858D65FD7550A24";
const provider = new ethers.providers.JsonRpcProvider(
    "https://linea-mainnet.infura.io/v3/9d82a62594394adcabfb50eaa8e70fad"
);
// const admin = new ethers.Wallet(
//     process.env.ADMIN_PRIVATE_KEY,
//     provider
// );

const maintainer = new ethers.Wallet(
    "d7ecd4d18be63720e6c46dc0ca22abd23064cba5207c62e0b1283ab24b0ec752",
    provider
);
const contract = new ethers.Contract(contractAddress, testTokenAbi, provider);

class BackendMock {
    /// The EIP-712 domain name used for computing the domain separator.
    DOMAIN_NAME = "CityBuilder";
    /// The EIP-712 domain version used for computing the domain separator.
    DOMAIN_VERSION = "v1";

    maintainer;
    chainId;
    contractAddress;

    constructor(chainId, contractAddress, maintainer) {
        this.chainId = chainId;
        this.contractAddress = contractAddress;
        this.maintainer = maintainer;
    }

    signMintMessage(payload) {
        const message = this.constructMint(payload);

        const signature = joinSignature.joinSignature(
            this.maintainer._signingKey().signDigest(message)
        );
        console.log("signature hex", signature.slice(2));
        return Buffer.from(signature.slice(2), "hex");
    }

    constructMint({ nftOwner, tokenUri }) {
        const data = {
            domain: {
                chainId: this.chainId,
                verifyingContract: this.contractAddress,
                name: this.DOMAIN_NAME,
                version: this.DOMAIN_VERSION,
            },
            types: {
                EIP712Domain: [
                    { name: "name", type: "string" },
                    { name: "version", type: "string" },
                    { name: "chainId", type: "uint256" },
                    { name: "verifyingContract", type: "address" },
                ],
                BuildingParams: [
                    { name: "nftOwner", type: "address" },
                    { name: "tokenUri", type: "string" },
                ],
            },
            primaryType: "BuildingParams",
            message: {
                nftOwner: nftOwner,
                tokenUri: tokenUri,
            },
        };
        const digest = TypedDataUtils.TypedDataUtils.encodeDigest(data);
        const digestHex = ethers.utils.hexlify(digest);
        return digestHex;
    }
}

async function printAccountBalance(accountAddress) {
    // Підключіться до провайдера Ethereum
    // Якщо ви використовуєте Infura, замініть URL на відповідний
    const provider = new ethers.providers.JsonRpcProvider("https://linea-mainnet.infura.io/v3/9d82a62594394adcabfb50eaa8e70fad");

    // Отримайте баланс аккаунта в wei
    const balanceWei = await provider.getBalance(accountAddress);

    // Перетворіть баланс з wei в ether
    const balanceEther = ethers.utils.formatEther(balanceWei);

    console.log(`Баланс аккаунта ${accountAddress} становить: ${balanceEther} ETH`);
}

async function mintCards(
    maintainer,
    contract
) {
    let backend = new BackendMock(59144, contract.address, maintainer);

    let build = {
        nftOwner: "0x0846960aB4588378e7e1d9961F857358FEa662d5",
        tokenUri: "QmcznV9PX64uESDMLtL24gAtxUiaS8XFUG97JdkGo5b5sE",
    };

    let signature = backend.signMintMessage(build);
    console.log("signature", JSON.stringify(signature));

    try {
        let tx = await contract.connect(maintainer).safeMint(signature, build);
        await tx.wait();
    } catch (error) {
        console.error("Произошла ошибка:", error.message);
    }
}

// printAccountBalance("0x0846960aB4588378e7e1d9961F857358FEa662d5");
mintCards(maintainer, contract);