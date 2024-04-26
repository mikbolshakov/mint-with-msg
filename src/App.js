import "./App.css";
import React, { useState } from "react";
import { ethers } from "ethers";
import { joinSignature } from "ethers/lib/utils";
import { TypedDataUtils } from "ethers-eip712";
import { Buffer } from "buffer";

function App() {
  const contractAddr = process.env.REACT_APP_CONTRACT_ADDRESS;
  const provider = new ethers.providers.Web3Provider(window.ethereum);

  const maintainer = new ethers.Wallet(
    process.env.REACT_APP_MAINTAINER_PRIV_KEY,
    provider
  );

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

    signFindSatoshiMessage(payload) {
      const message = this.constructFindSatoshi(payload);

      const signature = joinSignature(
        this.maintainer._signingKey().signDigest(message)
      );
      return Buffer.from(signature.slice(2), "hex");
    }

    constructFindSatoshi({
      freakCardId,
      geekCardId,
      slackerCardId,
      hackerCardId,
      newCardsCids,
      newCardsDnas,
    }) {
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
          FindSatoshiParams: [
            { name: "freakCardId", type: "uint256" },
            { name: "geekCardId", type: "uint256" },
            { name: "slackerCardId", type: "uint256" },
            { name: "hackerCardId", type: "uint256" },
            { name: "newCardsCids", type: "string[]" },
            { name: "newCardsDnas", type: "uint256[]" },
          ],
        },
        primaryType: "FindSatoshiParams",
        message: {
          freakCardId: freakCardId,
          geekCardId: geekCardId,
          slackerCardId: slackerCardId,
          hackerCardId: hackerCardId,
          newCardsCids: newCardsCids,
          newCardsDnas: newCardsDnas,
        },
      };
      const digest = TypedDataUtils.encodeDigest(data);
      const digestHex = ethers.utils.hexlify(digest);
      return digestHex;
    }
  }

  async function mintHandler() {
    let backend = new BackendMock(56, contractAddr, maintainer);

    let findSatoshi = {
      freakCardId: 87,
      geekCardId: 1097,
      slackerCardId: 1489,
      hackerCardId: 996,
      newCardsCids: ["QmWtkoLmGK1mBYCEFSFAbEjXXqkh2ZFExjF3CxhzJpUz58"],
      newCardsDnas: [3003],
    };

    let signature = backend.signFindSatoshiMessage(findSatoshi);
    console.log(signature);
    let hexString = Array.from(signature)
      .map((byte) => {
        return ("0" + (byte & 0xff).toString(16)).slice(-2);
      })
      .join("");

    console.log(hexString);

    try {
    } catch (error) {
      console.error("Произошла ошибка:", error.message);
    }
  }

  return <button onClick={mintHandler}>mint</button>;
}

export default App;
