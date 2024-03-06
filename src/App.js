import "./App.css";
import React, { useState } from "react";
import { ethers } from "ethers";
import contractAbi from "./ABI/mumbaiGameControllerAbi.json";
import { joinSignature } from "ethers/lib/utils";
import { TypedDataUtils } from "ethers-eip712";
import { Buffer } from "buffer";

function App() {
    const [metaMaskConnected, setMetaMaskConnected] = useState(false);
    const contractAddr = process.env.REACT_APP_CONTRACT_ADDRESS;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddr, contractAbi, signer);

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

                if (currentChainId !== "0x13881") {
                    try {
                        await window.ethereum.request({
                            method: "wallet_switchEthereumChain",
                            params: [{ chainId: "0x13881" }],
                        });
                    } catch (switchError) {
                        if (switchError.code === 4902) {
                            try {
                                await window.ethereum.request({
                                    method: "wallet_addEthereumChain",
                                    params: [
                                        {
                                            chainId: "0x13881",
                                            chainName: "Mumbai Testnet",
                                            rpcUrls: [
                                                "https://rpc-mumbai.maticvigil.com/",
                                            ],
                                            nativeCurrency: {
                                                name: "MATIC",
                                                symbol: "MATIC",
                                                decimals: 18,
                                            },
                                            blockExplorerUrls: [
                                                "https://mumbai.polygonscan.com/",
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
        DOMAIN_NAME = "SatoshiQuest WebApp";
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

            return Buffer.from(signature.slice(2), "hex");
            // return bufferSignature;
        }

        constructMint({ primaryCardId, secondaryCardId, newDna, newCID }) {
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
                        { name: "primaryCardId", type: "uint256" },
                        { name: "secondaryCardId", type: "uint256" },
                        { name: "newDna", type: "uint256" },
                        { name: "newCID", type: "string" },
                    ],
                },
                primaryType: "BuildingParams",
                message: {
                    primaryCardId: primaryCardId,
                    secondaryCardId: secondaryCardId,
                    newDna: newDna,
                    newCID: newCID,
                },
            };
            const digest = TypedDataUtils.encodeDigest(data);
            const digestHex = ethers.utils.hexlify(digest);
            return digestHex;
        }
    }

    async function mintHandler() {
        let backend = new BackendMock(80001, contractAddr, maintainer);

        let build = {
            primaryCardId: 553,
            secondaryCardId: 575,
            newDna: 233004859413,
            newCID: "QmWtkoLmGK1mBYCEFSFAbEjXXqkh2ZFExjF3CxhzJpUz58",
        };

        let signature = backend.signMintMessage(build);

        try {
            const txGasPrice = await provider.getGasPrice();
            let tx = await contract.upgradeCard(signature, build, 1, {
                gasPrice: txGasPrice,
                gasLimit: 250000,
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
