import "./App.css";
import React from "react";
import { ethers } from "ethers";
import { joinSignature } from "ethers/lib/utils";
import { TypedDataUtils } from "ethers-eip712";
import { Buffer } from "buffer";
import testnetContractAbi from "./ABI/abiRunner2060.json";

function App() {
  const [metaMaskConnected, setMetaMaskConnected] = React.useState(false);
  const [walletAddress, setWalletAddress] = React.useState("");
  const contractAddr = process.env.REACT_APP_CONTRACT_ADDRESS;
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const maintainer = new ethers.Wallet(
    process.env.REACT_APP_MAINTAINER_PRIV_KEY,
    provider
  );
  const contract = new ethers.Contract(
    contractAddr,
    testnetContractAbi,
    signer
  );

  const shortAddress = (address) => {
    return address ? address.substr(0, 6) + "..." + address.substr(-5) : "";
  };

  const disconnectWalletHandler = () => {
    if (window.ethereum) {
      try {
        if (typeof window.ethereum.disconnect === "function") {
          window.ethereum.disconnect();
        }

        setMetaMaskConnected(false);
        setWalletAddress("");
      } catch (error) {
        console.log(error);
      }
    }
  };

  const connectMetamaskHandler = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum
          .request({ method: "eth_requestAccounts" })
          .then((res) => {
            console.log(res);
            return res;
          });

        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }

        const currentChainId = await window.ethereum.request({
          method: "eth_chainId",
        });

        if (currentChainId !== "0xE705") {
          try {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0xE705" }],
            });
          } catch (switchError) {
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: "0xE705",
                      chainName: "Linea Sepolia test network",
                      rpcUrls: ["https://linea-sepolia.infura.io/v3/"],
                      nativeCurrency: {
                        name: "ETH",
                        symbol: "ETH",
                        decimals: 18,
                      },
                      blockExplorerUrls: ["https://sepolia.lineascan.build"],
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
      alert("install metamask extension!!");
    }
  };

  class BackendMock {
    /// The EIP-712 domain name used for computing the domain separator.
    DOMAIN_NAME = "Runner2060coin";
    /// The EIP-712 domain version used for computing the domain separator.
    DOMAIN_VERSION = "V1";

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
      console.log("4 message", message);

      const signature = joinSignature(
        this.maintainer._signingKey().signDigest(message)
      );
      console.log("5 signature", signature);

      console.log("6 Buffer", Buffer.from(signature.slice(2), "hex"));
      return Buffer.from(signature.slice(2), "hex");
    }

    constructMint({ userAddress, amount, salt }) {
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
          MintingParams: [
            { name: "userAddress", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "salt", type: "bytes32" },
          ],
        },
        primaryType: "MintingParams",
        message: {
          userAddress: userAddress,
          amount: amount,
          salt: salt,
        },
      };
      console.log("1 data", data);
      const digest = TypedDataUtils.encodeDigest(data);
      console.log("2 digest", digest);
      const digestHex = ethers.utils.hexlify(digest);
      console.log("3 digestHex", digestHex);
      return digestHex;
    }
  }

  async function mintHandler() {
    const accounts = await window.ethereum
      .request({ method: "eth_requestAccounts" })
      .then((res) => {
        console.log(res);
        return res;
      });

    if (accounts.length > 0) {
      setWalletAddress(accounts[0]);
    }

    let backend = new BackendMock(59141, contractAddr, maintainer);

    let mintOne = {
      userAddress: walletAddress,
      amount: 5000000000000000,
      salt: "0x666b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e37",
    };
    console.log("userAddress", signer.address);

    let signature = backend.signMintMessage(mintOne);
    console.log("7 signature", signature);

    try {
      await contract.mint(signature, mintOne, {
        gasLimit: 500000,
      });
    } catch (error) {
      console.error("Minting error:", error.message);
    }
  }

  return (
    <>
      {metaMaskConnected ? (
        <button className="connect-button" onClick={disconnectWalletHandler}>
          {shortAddress(walletAddress)}
        </button>
      ) : (
        <button className="connect-button" onClick={connectMetamaskHandler}>
          Connect MetaMask
        </button>
      )}
      <button className="mint-button" onClick={mintHandler}>
        Mint
      </button>
    </>
  );
}

export default App;
