import "./App.css";
import React, { useState } from "react";
import { ethers } from "ethers";
import contractAbi from "./ABI/abi.json";
import { joinSignature } from "ethers/lib/utils";
import { TypedDataUtils } from "ethers-eip712";
import { Buffer } from "buffer";

function App() {
    const [metaMaskConnected, setMetaMaskConnected] = useState(false);
    const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, contractAbi, signer);

    const maintainer = new ethers.Wallet(
        process.env.REACT_APP_MAINTAINER_PRIV_KEY,
        provider
    );

    const connectMetamaskHandler = async () => {
        if (window.ethereum) {
            try {
                const currentChainId = await window.ethereum.request({
                    method: "eth_chainId",
                });

                if (currentChainId !== "0xE708") {
                    try {
                        await window.ethereum.request({
                            method: "wallet_switchEthereumChain",
                            params: [{ chainId: "0xE708" }],
                        });
                    } catch (switchError) {
                        if (switchError.code === 4902) {
                            try {
                                await window.ethereum.request({
                                    method: "wallet_addEthereumChain",
                                    params: [
                                        {
                                            chainId: "0xE708",
                                            chainName: "Linea Mainnet",
                                            rpcUrls: [
                                                "https://linea-mainnet.infura.io/v3/",
                                            ],
                                            nativeCurrency: {
                                                name: "ETH",
                                                symbol: "ETH",
                                                decimals: 18,
                                            },
                                            blockExplorerUrls: [
                                                "https://lineascan.build",
                                            ],
                                        },
                                    ],
                                });
                            } catch (addError) {
                                console.log(addError);
                                return;
                            }
                        } else {
                            console.log(switchError);
                            return;
                        }
                    }
                }

                setMetaMaskConnected(true);
            } catch (error) {
                console.log(error);
            }
        } else {
            alert("Install MetaMask extension!");
        }
    };

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

            const signature = joinSignature(
                this.maintainer._signingKey().signDigest(message)
            );

            const bufferSignature = Buffer.from(signature.slice(2), "hex");

            return bufferSignature;
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
            const digest = TypedDataUtils.encodeDigest(data);
            const digestHex = ethers.utils.hexlify(digest);
            return digestHex;
        }
    }

    async function mintHandler() {
        let backend = new BackendMock(59144, contract.address, maintainer);

        let build = {
            nftOwner: "0x2c84C3D16AaAC1157919D9210CBC7b8797F5A91a",
            tokenUri: "QmcznV9PX64uESDMLtL24gAtxUiaS8XFUG97JdkGo5b5sj",
        };

        let signature = backend.signMintMessage(build);

        try {
            const txGasPrice = await provider.getGasPrice();

            let tx = await contract.safeMint(signature, build, {
                gasPrice: txGasPrice,
                gasLimit: 2500000,
            });
            await tx.wait();
        } catch (error) {
            console.error("Произошла ошибка:", error.message);
        }
    }

    return (
        <>
            {metaMaskConnected ? (
                <button onClick={mintHandler}>mint</button>
            ) : (
                <button onClick={connectMetamaskHandler}>Connect wallet</button>
            )}
        </>
    );
}

export default App;
