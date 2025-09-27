"use client";

import { useState } from "react";
import thirdwebIcon from "@public/thirdweb.svg";
import Image from "next/image";
import { ConnectButton, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareTransaction, toWei } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { client } from "./client";

export default function Home() {
  const account = useActiveAccount();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState("");

  const { mutate: sendTransaction } = useSendTransaction();

  const handleTransfer = async () => {
    if (!account) {
      setTransactionStatus("Please connect your wallet first.");
      return;
    }

    if (!recipient || !amount) {
      setTransactionStatus("Please enter a valid recipient address and amount.");
      return;
    }

    try {
      setIsSending(true);
      setTransactionStatus("Preparing transaction...");

      // Prepare a raw transaction to send native tokens
      const transaction = prepareTransaction({
        chain: sepolia, // Or any other chain you want to use
        to: recipient,
        value: toWei(amount),
        client: client,
      });

      setTransactionStatus("Sending transaction...");
      // Send the transaction and wait for the result
      await sendTransaction(transaction);

      setTransactionStatus("Transaction sent successfully!");
      setRecipient("");
      setAmount("");
    } catch (error) {
      console.error("Failed to send transaction:", error);
      setTransactionStatus("Transaction failed. Check console for details.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="p-4 pb-10 min-h-[100vh] flex flex-col items-center justify-center container max-w-screen-lg mx-auto">
      <div className="py-20 flex flex-col items-center">
        <Header />

        <div className="flex justify-center mb-10">
          <ConnectButton
            client={client}
            appMetadata={{
              name: "NFC Payment App",
              url: "https://example.com",
            }}
          />
        </div>

        {account && (
          <div className="w-full max-w-sm p-6 bg-zinc-900 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-center text-zinc-100 mb-6">
              Send {sepolia.nativeCurrency?.symbol ?? "ETH"}
            </h2>
            <div className="space-y-4">
              <label className="block">
                <span className="text-zinc-400 text-sm">Recipient Address</span>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  className="mt-1 block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-zinc-400 text-sm">Amount</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <button
                onClick={handleTransfer}
                disabled={isSending}
                className={`w-full px-4 py-2 rounded-md font-semibold transition-colors duration-200 ${
                  isSending
                    ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isSending ? "Sending..." : "Send Transaction"}
              </button>
            </div>
            {transactionStatus && (
              <p className="mt-4 text-center text-sm text-zinc-400">
                {transactionStatus}
              </p>
            )}
          </div>
        )}
      </div>
  {/* <ThirdwebResources /> removed as requested */}
    </main>
  );
}

function Header() {
  return (
    <header className="flex flex-col items-center mb-10">
      <Image
        src={thirdwebIcon}
        alt=""
        className="size-[150px] md:size-[150px]"
        style={{ filter: "drop-shadow(0px 0px 24px #a726a9a8)" }}
      />
      <h1 className="text-2xl md:text-6xl font-semibold md:font-bold tracking-tighter mb-6 text-zinc-100">
        NFC Payment
        <span className="text-zinc-300 inline-block mx-1"> + </span>
        <span className="inline-block -skew-x-6 text-blue-500"> Web3</span>
      </h1>
      <p className="text-zinc-300 text-base">
        Connect your wallet to send {sepolia.nativeCurrency?.symbol ?? "ETH"}.
      </p>
    </header>
  );
}



function ArticleCard(props: {
  title: string;
  href: string;
  description: string;
}) {
  return (
    <a
      href={props.href + "?utm_source=next-template"}
      target="_blank"
      className="flex flex-col border border-zinc-800 p-4 rounded-lg hover:bg-zinc-900 transition-colors hover:border-zinc-700"
    >
      <article>
        <h2 className="text-lg font-semibold mb-2">{props.title}</h2>
        <p className="text-sm text-zinc-400">{props.description}</p>
      </article>
    </a>
  );
}