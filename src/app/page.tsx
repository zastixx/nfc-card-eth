// pages/index.tsx (or app/page.tsx for App Router)
'use client';
import React, { useState, useEffect } from 'react';
import { Nfc, CreditCard, ShoppingCart, CheckCircle, AlertCircle, Loader, Smartphone, Wallet, ExternalLink, DollarSign, Zap, Network } from 'lucide-react';
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { createWallet, injectedProvider } from "thirdweb/wallets";
import { polygon, sepolia } from "thirdweb/chains";
import { ConnectButton, useActiveAccount, useActiveWallet } from "thirdweb/react";

type PaymentData = {
  userWallet: string;
  merchantAddress: string;
  protocol?: string;
};

type MerchantInfo = {
  name: string;
  address: string;
  orderId: string;
  amount: string;
  currency: string;
  x402Endpoint?: string;
};

type X402Response = {
  success: boolean;
  transactionHash?: string;
  error?: string;
  paymentId?: string;
};

type NetworkConfig = {
  id: number;
  name: string;
  currency: string;
  chain: any;
  explorerUrl: string;
};

// Initialize Thirdweb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "YOUR_CLIENT_ID_HERE"
});

// Network configurations
const networks: { [key: string]: NetworkConfig } = {
  polygon: {
    id: 137,
    name: "Polygon",
    currency: "MATIC",
    chain: polygon,
    explorerUrl: "https://polygonscan.com"
  },
  sepolia: {
    id: 11155111,
    name: "Sepolia Testnet",
    currency: "SepoliaETH",
    chain: sepolia,
    explorerUrl: "https://sepolia.etherscan.io"
  }
};

const X402PaymentApp = () => {
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [currentStep, setCurrentStep] = useState('scan');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('polygon');
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo>({
    name: 'Web3 Coffee Shop',
    address: '0x2fF9c787761Ff79a30574b51f1C83d21510Fbc0e',
    orderId: '',
    amount: '',
    currency: 'MATIC',
    x402Endpoint: 'https://api.merchant.com/x402/payment'
  });
  const [transactionHash, setTransactionHash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [x402PaymentId, setX402PaymentId] = useState('');
  const [error, setError] = useState('');

  // Thirdweb hooks
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();

  // Check for URL parameters and NFC support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setNfcSupported(true);
    }

    // Parse URL parameters for payment data
    const urlParams = new URLSearchParams(window.location.search);
    const walletFromUrl = urlParams.get('wallet');
    const merchantFromUrl = urlParams.get('merchant');
    const protocolFromUrl = urlParams.get('protocol');
    const networkFromUrl = urlParams.get('network');
    
    if (walletFromUrl) {
      setPaymentData({
        userWallet: walletFromUrl,
        merchantAddress: merchantFromUrl || merchantInfo.address,
        protocol: protocolFromUrl || 'x402'
      });
      
      if (networkFromUrl && networks[networkFromUrl]) {
        setSelectedNetwork(networkFromUrl);
        setMerchantInfo(prev => ({ 
          ...prev, 
          currency: networks[networkFromUrl].currency,
          address: merchantFromUrl || prev.address
        }));
      }
      
      setCurrentStep('payment');
      console.log('Payment data loaded from URL:', { walletFromUrl, merchantFromUrl, protocolFromUrl, networkFromUrl });
    }
  }, []);

  // Update currency when network changes
  useEffect(() => {
    setMerchantInfo(prev => ({ 
      ...prev, 
      currency: networks[selectedNetwork].currency 
    }));
  }, [selectedNetwork]);

  // NFC Reading Function
  const startNFCReading = async () => {
    if (!nfcSupported) {
      alert('NFC is not supported on this device/browser');
      return;
    }

    try {
      setNfcReading(true);
      setError('');
      
      // @ts-ignore: NDEFReader is available in supporting browsers
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      
      console.log("NFC scan started successfully.");
      
      ndef.addEventListener("reading", (event: { message: { records: any[] } }) => {
        const { message } = event;
        console.log("NFC tag read:", message);
        
        for (const record of message.records) {
          if (record.recordType === "url") {
            const decoder = new TextDecoder();
            const url = decoder.decode(record.data);
            console.log("URL from NFC:", url);
            
            const urlObj = new URL(url);
            const wallet = urlObj.searchParams.get('wallet');
            const merchant = urlObj.searchParams.get('merchant');
            const protocol = urlObj.searchParams.get('protocol');
            const network = urlObj.searchParams.get('network') || 'polygon';
            
            if (wallet) {
              setPaymentData({
                userWallet: wallet,
                merchantAddress: merchant || merchantInfo.address,
                protocol: protocol || 'x402'
              });
              setSelectedNetwork(network);
              setCurrentStep('payment');
            }
          } else if (record.recordType === "text") {
            const decoder = new TextDecoder();
            const text = decoder.decode(record.data);
            console.log("Text from NFC:", text);
            
            try {
              const data = JSON.parse(text);
              if (data.wallet) {
                setPaymentData({
                  userWallet: data.wallet,
                  merchantAddress: data.merchant || merchantInfo.address,
                  protocol: data.protocol || 'x402'
                });
                setSelectedNetwork(data.network || 'polygon');
                setCurrentStep('payment');
              }
            } catch {
              console.log("NFC text is not JSON");
            }
          }
        }
        
        setNfcReading(false);
      });

      ndef.addEventListener("readingerror", () => {
        console.log("Cannot read data from the NFC tag.");
        setNfcReading(false);
        setError("Failed to read NFC tag");
      });

    } catch (error) {
      console.log("Error starting NFC scan:", error);
      setNfcReading(false);
      
      // Demo simulation
      setTimeout(() => {
        setPaymentData({
          userWallet: '0xD450060963E63cD0C76d3c113CcB9179fc7fd7cE',
          merchantAddress: merchantInfo.address,
          protocol: 'x402'
        });
        setCurrentStep('payment');
        setNfcReading(false);
      }, 2000);
    }
  };

  // Write NFC Tag
  const writeNFCTag = async () => {
    if (!nfcSupported) {
      alert('NFC is not supported on this device/browser');
      return;
    }

    try {
      // @ts-ignore: NDEFReader is available in supporting browsers
      const ndef = new (window as any).NDEFReader();
      
      const baseUrl = `${window.location.origin}`;
      const paymentUrl = `${baseUrl}?wallet=0xD450060963E63cD0C76d3c113CcB9179fc7fd7cE&merchant=${merchantInfo.address}&protocol=x402&network=${selectedNetwork}`;
      
      const x402PaymentData = {
        wallet: "0xD450060963E63cD0C76d3c113CcB9179fc7fd7cE",
        merchant: merchantInfo.address,
        protocol: "x402",
        chain: selectedNetwork,
        network: selectedNetwork,
        type: "web3-payment-card",
        version: "1.0",
        features: ["instant-settlement", "micropayments", "agentic"]
      };
      
      await ndef.write({
        records: [
          { recordType: "url", data: paymentUrl },
          { recordType: "text", data: JSON.stringify(x402PaymentData) }
        ]
      });
      
      alert("x402-enabled NFC payment card created successfully!");
      
    } catch (error) {
      console.log("Error writing NFC tag:", error);
      alert("Error writing to NFC tag. Make sure you have a writable NTAG card nearby.");
    }
  };

  // Process Native Token Payment using Thirdweb v5
  const processNativeTokenPayment = async () => {
    if (!merchantInfo.amount || !activeAccount || !activeWallet) {
      setError('Please connect wallet and enter payment amount');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('confirm');
    setError('');

    try {
      console.log('Processing native token payment via Thirdweb v5...');
      
      const networkConfig = networks[selectedNetwork];
      const amountInWei = BigInt(Math.floor(parseFloat(merchantInfo.amount) * 1e18));
      
      // Prepare transaction data
      const transactionData = {
        to: merchantInfo.address,
        value: amountInWei,
        chain: networkConfig.chain,
        client: client
      };

      console.log('Transaction data:', {
        to: merchantInfo.address,
        value: merchantInfo.amount + ' ' + networkConfig.currency,
        valueInWei: amountInWei.toString(),
        chain: networkConfig.name
      });

      // Send native token transaction
      const result = await sendTransaction({
        transaction: transactionData,
        account: activeAccount
      });

      console.log('Transaction sent:', result);
      
      // Transaction successful
      setTransactionHash(result.transactionHash);
      setX402PaymentId('x402_' + Date.now().toString(16));
      setCurrentStep('success');
      setIsProcessing(false);

    } catch (error: any) {
      console.error('Payment failed:', error);
      setError(error.message || 'Transaction failed. Please try again.');
      setIsProcessing(false);
      setCurrentStep('payment');
    }
  };

  // Switch network in wallet
  const switchNetwork = async (networkKey: string) => {
    if (!activeWallet) return;
    
    try {
      const networkConfig = networks[networkKey];
      await activeWallet.switchChain(networkConfig.chain);
      setSelectedNetwork(networkKey);
      setMerchantInfo(prev => ({ ...prev, currency: networkConfig.currency }));
    } catch (error) {
      console.error('Failed to switch network:', error);
      setError('Failed to switch network');
    }
  };

  const resetFlow = () => {
    setCurrentStep('scan');
    setPaymentData(null);
    setTransactionHash('');
    setX402PaymentId('');
    setError('');
    setMerchantInfo(prev => ({ ...prev, orderId: '', amount: '' }));
    
    // Clear URL parameters
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <Nfc className="w-12 h-12 text-blue-400 mr-3" />
            <Zap className="w-8 h-8 text-yellow-400 mr-2" />
            <DollarSign className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
            NFC × Thirdweb v5 × x402
          </h1>
          <p className="text-blue-200 mb-2">Multi-Chain Payment Terminal</p>
          <div className="flex justify-center items-center gap-4 text-sm">
            <span className="px-3 py-1 bg-purple-600/50 rounded-full text-purple-200">Thirdweb v5</span>
            <span className="px-3 py-1 bg-green-600/50 rounded-full text-green-200">Multi-Chain</span>
            <span className="px-3 py-1 bg-blue-600/50 rounded-full text-blue-200">NFC Enabled</span>
          </div>
          
          {/* Network Selector */}
          <div className="mt-4 flex justify-center">
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-2 border border-gray-500/30">
              <div className="flex gap-2">
                {Object.entries(networks).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => switchNetwork(key)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                      selectedNetwork === key
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    <Network className="w-4 h-4 inline mr-2" />
                    {config.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 rounded-lg border border-red-500/50 max-w-md mx-auto">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {!nfcSupported && (
            <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/50 max-w-md mx-auto">
              <p className="text-yellow-300 text-sm">
                NFC not supported. Using simulation mode.
              </p>
            </div>
          )}
        </header>

        <div className="max-w-2xl mx-auto">
          
          {/* Thirdweb Connect Button */}
          <div className="mb-8 text-center">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
              <h3 className="text-lg font-semibold text-white mb-4">Connect Your Wallet</h3>
              <ConnectButton
                client={client}
                theme="dark"
                connectModal={{
                  size: "wide",
                  titleIcon: "",
                  showThirdwebBranding: false,
                }}
                chains={[polygon, sepolia]}
                switchButton={{
                  label: "Wrong Network",
                  style: {
                    backgroundColor: "#dc2626",
                  },
                }}
              />
              {activeAccount && (
                <div className="mt-4 p-3 bg-green-500/20 rounded-lg">
                  <p className="text-green-300 text-sm">
                    Connected: {activeAccount.address.slice(0, 10)}...{activeAccount.address.slice(-8)}
                  </p>
                  <p className="text-green-400 text-xs">Network: {networks[selectedNetwork].name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Step 1: NFC Scan */}
          {currentStep === 'scan' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/30">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Step 1: Customer NFC Tap
              </h2>
              
              <div className="text-center mb-8">
                <div className="relative inline-block">
                  <Nfc className={`w-24 h-24 mx-auto mb-4 ${nfcReading ? 'text-blue-400 animate-pulse' : 'text-gray-400'}`} />
                  {nfcReading && (
                    <>
                      <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-blue-400 rounded-full animate-ping"></div>
                      <div className="absolute inset-0 w-20 h-20 mx-auto mt-2 border-2 border-purple-400 rounded-full animate-ping"></div>
                    </>
                  )}
                </div>
                
                <p className="text-gray-300 mb-6">
                  {nfcReading ? 'Scanning for x402-enabled payment card...' : 'Ready to scan x402 NFC payment card'}
                </p>

                <button
                  onClick={startNFCReading}
                  disabled={nfcReading}
                  className={`px-8 py-4 rounded-lg font-semibold transition-all duration-200 ${
                    nfcReading 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105'
                  } text-white`}
                >
                  {nfcReading ? (
                    <div className="flex items-center">
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Scanning x402...
                    </div>
                  ) : (
                    'Start x402 NFC Scan'
                  )}
                </button>
              </div>

              {/* Demo Tools */}
              <div className="border-t border-gray-600 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Demo Tools</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={writeNFCTag}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-colors text-sm font-semibold"
                  >
                    Write x402 NFC Card
                  </button>
                  <button
                    onClick={() => {
                      setPaymentData({
                        userWallet: '0xD450060963E63cD0C76d3c113CcB9179fc7fd7cE',
                        merchantAddress: merchantInfo.address,
                        protocol: 'x402'
                      });
                      setCurrentStep('payment');
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors text-sm font-semibold"
                  >
                    Simulate x402 Tap
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Payment Details */}
          {currentStep === 'payment' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-green-500/30">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Step 2: Payment Details
              </h2>

              {/* Network Status */}
              <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-3 mb-6 border border-blue-500/30">
                <div className="flex items-center justify-center">
                  <Network className="w-5 h-5 text-blue-400 mr-2" />
                  <span className="text-white font-semibold">Network: {networks[selectedNetwork].name}</span>
                  <span className="ml-2 px-2 py-1 bg-green-500/20 rounded text-green-300 text-xs">ACTIVE</span>
                </div>
              </div>

              {/* Customer Wallet */}
              {paymentData && (
                <div className="bg-black/40 rounded-lg p-4 mb-6">
                  <label className="text-green-400 text-sm font-semibold">Customer Wallet (from NFC)</label>
                  <div className="flex items-center mt-2">
                    <Wallet className="w-5 h-5 text-green-400 mr-2" />
                    <p className="text-white font-mono text-sm">{paymentData.userWallet}</p>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">Connected to {networks[selectedNetwork].name}</p>
                </div>
              )}

              {/* Merchant Info */}
              <div className="bg-black/40 rounded-lg p-4 mb-6">
                <label className="text-blue-400 text-sm font-semibold">Merchant</label>
                <p className="text-white font-semibold">{merchantInfo.name}</p>
                <p className="text-gray-400 font-mono text-sm">{merchantInfo.address}</p>
              </div>

              {/* Payment Amount */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-white text-sm font-semibold">Payment Amount</label>
                  <div className="flex mt-2">
                    <input
                      type="number"
                      step="0.000001"
                      value={merchantInfo.amount}
                      onChange={(e) => setMerchantInfo(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.001"
                      className="flex-1 px-4 py-3 bg-black/40 border border-gray-600 rounded-l-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="px-4 py-3 bg-gradient-to-r from-purple-700 to-blue-700 border border-gray-600 rounded-r-lg text-white font-semibold">
                      {networks[selectedNetwork].currency}
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">Minimum: 0.000001 {networks[selectedNetwork].currency}</p>
                </div>

                <div>
                  <label className="text-white text-sm font-semibold">Order ID</label>
                  <input
                    type="text"
                    value={merchantInfo.orderId}
                    onChange={(e) => setMerchantInfo(prev => ({ ...prev, orderId: e.target.value }))}
                    placeholder="ORDER_12345"
                    className="w-full mt-2 px-4 py-3 bg-black/40 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Payment Button */}
              <button
                onClick={processNativeTokenPayment}
                disabled={!merchantInfo.amount || !activeAccount || isProcessing}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 ${
                  !merchantInfo.amount || !activeAccount
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400' 
                    : 'bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 hover:from-purple-700 hover:via-blue-700 hover:to-green-700 text-white transform hover:scale-105'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Processing Payment...
                  </div>
                ) : !activeAccount ? (
                  'Connect Wallet First'
                ) : (
                  <div className="flex items-center justify-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Pay {merchantInfo.amount} {networks[selectedNetwork].currency}
                  </div>
                )}
              </button>

              <div className="text-center mt-4">
                <button
                  onClick={resetFlow}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  ← Back to NFC scan
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 'confirm' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/30">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Step 3: Processing Payment
              </h2>

              <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 rounded-lg p-3 mb-6 border border-yellow-500/30">
                <div className="flex items-center justify-center">
                  <Loader className="w-5 h-5 text-yellow-400 mr-2 animate-spin" />
                  <span className="text-white font-semibold">Thirdweb v5 Transaction Processing</span>
                </div>
              </div>

              <div className="text-center">
                <div className="relative">
                  <Loader className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-spin" />
                  <div className="absolute inset-0 w-12 h-12 mx-auto border-2 border-orange-400 rounded-full animate-ping"></div>
                </div>
                <p className="text-yellow-400 font-semibold">Processing transaction on {networks[selectedNetwork].name}...</p>
                <p className="text-gray-400 text-sm">Please confirm in your wallet if prompted</p>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {currentStep === 'success' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-green-500/30">
              <div className="text-center">
                <div className="relative mb-6">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
                  <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-green-400 rounded-full animate-ping"></div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Payment Successful!</h2>
                
                <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-lg p-3 mb-6 border border-green-500/30">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                    <span className="text-white font-semibold">Thirdweb v5 Transaction Completed</span>
                    <span className="ml-2 px-2 py-1 bg-green-500/20 rounded text-green-300 text-xs">SUCCESS</span>
                  </div>
                </div>
                
                <div className="bg-black/40 rounded-lg p-6 mb-6">
                  <p className="text-gray-400 text-sm mb-2">Transaction Hash:</p>
                  <div className="flex items-center justify-center mb-4">
                    <p className="text-blue-400 font-mono text-sm mr-2">{transactionHash.slice(0, 20)}...{transactionHash.slice(-10)}</p>
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <p className="text-white font-semibold">{merchantInfo.amount} {networks[selectedNetwork].currency} sent to {merchantInfo.name}</p>
                    <p className="text-gray-400 text-sm">Network: {networks[selectedNetwork].name}</p>
                    {merchantInfo.orderId && (
                      <p className="text-gray-400 text-sm">Order: {merchantInfo.orderId}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={resetFlow}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    New Payment
                  </button>
                  <button
                    onClick={() => window.open(`${networks[selectedNetwork].explorerUrl}/tx/${transactionHash}`, '_blank')}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    View Transaction
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <div className="max-w-2xl mx-auto bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-gray-500/20">
            <div className="flex justify-center items-center mb-4">
              <div className="flex items-center">
                <Network className="w-6 h-6 text-blue-400 mr-2" />
                <span className="text-white font-bold text-lg">Powered by Thirdweb v5</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-2">
              Multi-chain payments • NFC Integration • TypeScript
            </p>
            <div className="flex justify-center gap-4 text-xs">
              <span className="px-2 py-1 bg-purple-600/30 rounded text-purple-300">Polygon</span>
              <span className="px-2 py-1 bg-blue-600/30 rounded text-blue-300">Sepolia</span>
              <span className="px-2 py-1 bg-green-600/30 rounded text-green-300">Native Tokens</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

// Add window.ethereum type declaration
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default X402PaymentApp;