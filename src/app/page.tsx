'use client';
import React, { useState, useEffect } from 'react';
import { Nfc, CreditCard, ShoppingCart, CheckCircle, AlertCircle, Loader, Smartphone, Wallet, ExternalLink, DollarSign, Zap, Network, User, Settings, Store, Building2 } from 'lucide-react';
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { polygon, sepolia } from "thirdweb/chains";
import { ConnectButton, useActiveAccount, useActiveWallet, useConnect, useDisconnect } from "thirdweb/react";

type PaymentData = {
  userWallet: string;
  merchantAddress: string;
  protocol?: string;
  network?: string;
};

type Merchant = {
  id: string;
  name: string;
  address: string;
  description: string;
  category: string;
  logo?: string;
};

type MerchantInfo = {
  id: string;
  name: string;
  address: string;
  orderId: string;
  amount: string;
  currency: string;
  x402Endpoint?: string;
  description?: string;
  category?: string;
  logo?: string;
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
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "042852d11c6ddb740ca35a62807f77c3",
});

// Network configurations
const networks: { [key: string]: NetworkConfig } = {
  polygonMumbai: {
    id: 80001,
    name: "Polygon Mumbai",
    currency: "MATIC",
    chain: {
      ...polygon,
      id: 80001,
      name: "Mumbai",
      nativeCurrency: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18
      },
      rpc: ["https://rpc-mumbai.maticvigil.com/"],
      blockExplorers: {
        default: {
          name: "Mumbai Polygonscan",
          url: "https://mumbai.polygonscan.com"
        }
      },
      testnet: true
    },
    explorerUrl: "https://mumbai.polygonscan.com"
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
  const [selectedNetwork, setSelectedNetwork] = useState<string>('polygonMumbai');
  // Define the NDEFReadingEvent type
  type NDEFReadingEvent = {
    message: {
      records: Array<{
        recordType: string;
        data: ArrayBuffer;
      }>;
    };
  };

  // Initialize merchant states
  const [selectedMerchantId, setSelectedMerchantId] = useState('1');
  const [showMerchantForm, setShowMerchantForm] = useState(false);
  const [newMerchant, setNewMerchant] = useState<Merchant>({
    id: '',
    name: '',
    address: '',
    description: '',
    category: 'Food & Beverages'
  });
  
  // Initial merchants data
  const initialMerchants = [
    {
      id: '1',
      name: 'Web3 Coffee Shop',
      address: '0x2fF9c787761Ff79a30574b51f1C83d21510Fbc0e',
      description: 'Premium coffee and pastries',
      category: 'Food & Beverages'
    },
    {
      id: '2',
      name: 'Crypto Tech Store',
      address: '0x3eA9B0ab7785C85983b2F4F7eB2b0c723465098B',
      description: 'Electronics and gadgets',
      category: 'Technology'
    },
    {
      id: '3',
      name: 'NFT Art Gallery',
      address: '0x4dB0C7749A3eF6d6c45d94D8049859465cD537B2',
      description: 'Digital art and collectibles',
      category: 'Art'
    }
  ];

  // Merchants state
  const [merchants, setMerchants] = useState<Merchant[]>(initialMerchants);

  const handleMerchantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) {
      setError('Please connect your wallet first');
      return;
    }
    
    const newMerchantData = {
      ...newMerchant,
      id: (merchants.length + 1).toString(),
      address: activeAccount.address
    };
    
    setMerchants(prev => [...prev, newMerchantData]);
    setShowMerchantForm(false);
    setNewMerchant({
      id: '',
      name: '',
      address: '',
      description: '',
      category: 'Food & Beverages'
    });
  };
  
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo>({
    id: '1',
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
  const [isWritingNFC, setIsWritingNFC] = useState(false);
  const [customerWalletForNFC, setCustomerWalletForNFC] = useState('');

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
        protocol: protocolFromUrl || 'x402',
        network: networkFromUrl || selectedNetwork
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

  // Auto-connect wallet when payment data is detected
  useEffect(() => {
    if (paymentData && !activeAccount) {
      // Try to trigger wallet connection automatically
      console.log('Payment data detected, attempting auto-connect...');
      requestWalletConnection();
    }
  }, [paymentData, activeAccount]);

  // Request wallet connection programmatically
  const requestWalletConnection = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // Request account access
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        if (accounts.length > 0) {
          console.log('Wallet connected automatically:', accounts[0]);
          
          // Switch to the correct network if needed
          if (paymentData?.network && networks[paymentData.network]) {
            await switchNetwork(paymentData.network);
          }
        }
      }
    } catch (error) {
      console.error('Auto-connect failed:', error);
      setError('Please connect your wallet manually to proceed');
    }
  };

  // NFC Reading Function with improved parsing
  const startNFCReading = async () => {
    if (!nfcSupported) {
      alert('NFC is not supported on this device/browser');
      return;
    }

    try {
      setNfcReading(true);
      setError('');
      
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener("reading", async (event: NDEFReadingEvent) => {
        for (const record of event.message.records) {
          if (record.recordType === "url") {
            const decoder = new TextDecoder();
            const url = decoder.decode(record.data);
            
            try {
              const urlObj = new URL(url);
              const wallet = urlObj.searchParams.get('wallet');
              const merchant = urlObj.searchParams.get('merchant');
              const network = urlObj.searchParams.get('network') || 'polygonMumbai';
              
              if (wallet) {
                // Update payment data
                setPaymentData({
                  userWallet: wallet,
                  merchantAddress: merchant || merchantInfo.address,
                  protocol: 'x402'
                });
                
                // Set network
                setSelectedNetwork(network);
                
                // Auto-connect wallet
                if (!activeAccount && window.ethereum) {
                  try {
                    const accounts = await window.ethereum.request({
                      method: 'eth_requestAccounts'
                    });
                    
                    // Switch to correct network
                    const networkConfig = networks[network];
                    const chainIdHex = `0x${networkConfig.id.toString(16)}`;
                    
                    await window.ethereum.request({
                      method: 'wallet_switchEthereumChain',
                      params: [{ chainId: chainIdHex }],
                    });
                    
                    console.log('Wallet connected:', accounts[0]);
                  } catch (error) {
                    console.error('Wallet connection failed:', error);
                    setError('Please connect your wallet manually');
                  }
                }
                
                setCurrentStep('payment');
              }
            } catch (e) {
              console.error('Invalid URL data:', e);
              setError('Invalid NFC card data');
            }
          }
        }
        setNfcReading(false);
      });

    } catch (error) {
      console.error('NFC Error:', error);
      setNfcReading(false);
      setError('NFC read failed');
    }
  };

  // Write NFC Tag with customer wallet address
  const writeNFCTag = async () => {
    if (!nfcSupported) {
      alert('NFC is not supported on this device/browser');
      return;
    }

    if (!customerWalletForNFC.trim()) {
      setError('Please enter customer wallet address first');
      return;
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(customerWalletForNFC.trim())) {
      setError('Invalid wallet address format');
      return;
    }

    setIsWritingNFC(true);
    setError('');

    try {
      // @ts-ignore: NDEFReader is available in supporting browsers
      const ndef = new (window as any).NDEFReader();
      
      const customerWallet = customerWalletForNFC.trim();
      const baseUrl = `${window.location.origin}`;
      const paymentUrl = `${baseUrl}?wallet=${customerWallet}&merchant=${merchantInfo.address}&protocol=x402&network=${selectedNetwork}`;
      
      // Create comprehensive payment data
      const x402PaymentData = {
        // Primary data
        customerWallet: customerWallet,
        wallet: customerWallet, // Backup field
        merchant: merchantInfo.address,
        merchantName: merchantInfo.name,
        protocol: "x402",
        network: selectedNetwork,
        
        // Metadata
        type: "x402-payment-card",
        version: "1.1",
        created: new Date().toISOString(),
        chain: selectedNetwork,
        chainId: networks[selectedNetwork].id,
        currency: networks[selectedNetwork].currency,
        
        // Features
        features: [
          "instant-settlement", 
          "micropayments", 
          "multi-chain",
          "auto-connect"
        ]
      };
      
      console.log('Writing NFC with data:', x402PaymentData);
      
      await ndef.write({
        records: [
          { recordType: "url", data: paymentUrl },
          { recordType: "text", data: JSON.stringify(x402PaymentData) }
        ]
      });
      
      setIsWritingNFC(false);
      alert("✅ x402 Payment Card Created Successfully!\n\nCustomer: " + customerWallet.slice(0,8) + "..." + customerWallet.slice(-6) + "\nMerchant: " + merchantInfo.name + "\nNetwork: " + networks[selectedNetwork].name);
      
      // Clear the input
      setCustomerWalletForNFC('');
      
    } catch (error: any) {
      console.log("Error writing NFC tag:", error);
      setIsWritingNFC(false);
      setError(error.message || "Error writing to NFC tag. Make sure you have a writable NTAG card nearby.");
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
        chain: networkConfig.name,
        from: activeAccount.address
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
    if (!window.ethereum) return;
    
    try {
      const networkConfig = networks[networkKey];
      const chainIdHex = `0x${networkConfig.id.toString(16)}`;
      
      try {
        // First try to switch to the network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError: any) {
        // If the chain hasn't been added to MetaMask we'll add it
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: chainIdHex,
                chainName: networkConfig.chain.name,
                nativeCurrency: networkConfig.chain.nativeCurrency,
                rpcUrls: networkConfig.chain.rpc,
                blockExplorerUrls: [networkConfig.explorerUrl]
              }]
            });
          } catch (addError) {
            console.error('Failed to add network:', addError);
            setError('Failed to add network to wallet');
            return;
          }
        } else {
          throw switchError;
        }
      }

      // After successful switch/add, update the UI
      setSelectedNetwork(networkKey);
      setMerchantInfo(prev => ({ ...prev, currency: networkConfig.currency }));
      
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      setError(error.message || 'Failed to switch network');
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-x-hidden">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
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
          <div className="flex flex-wrap justify-center items-center gap-2 text-sm px-4">
            <span className="px-3 py-1 bg-purple-600/50 rounded-full text-purple-200 whitespace-nowrap">Thirdweb v5</span>
            <span className="px-3 py-1 bg-green-600/50 rounded-full text-green-200 whitespace-nowrap">Multi-Chain</span>
            <span className="px-3 py-1 bg-blue-600/50 rounded-full text-blue-200 whitespace-nowrap">NFC Enabled</span>
            <span className="px-3 py-1 bg-orange-600/50 rounded-full text-orange-200 whitespace-nowrap">Auto-Connect</span>
          </div>
          
          {/* Network Selector */}
          <div className="mt-4 flex justify-center">
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-2 border border-gray-500/30 overflow-x-auto max-w-full">
              <div className="flex gap-2 min-w-max">
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

          {/* Marketplace Section */}
          <div className="mt-8 max-w-4xl mx-auto">
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center">
                <Store className="w-5 h-5 mr-2" />
                Web3 Marketplace
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {merchants.map((merchant) => (
                  <button
                    key={merchant.id}
                    onClick={() => {
                      setSelectedMerchantId(merchant.id);
                      setMerchantInfo(prev => ({
                        ...prev,
                        id: merchant.id,
                        name: merchant.name,
                        address: merchant.address
                      }));
                    }}
                    className={`${
                      selectedMerchantId === merchant.id
                        ? 'bg-gradient-to-r from-purple-600/50 to-blue-600/50 border-purple-500'
                        : 'bg-black/40 hover:bg-black/60 border-gray-600'
                    } p-4 rounded-lg border transition-all duration-200`}
                  >
                    <div className="flex items-center mb-2">
                      <Building2 className={`w-5 h-5 ${
                        selectedMerchantId === merchant.id ? 'text-purple-400' : 'text-gray-400'
                      } mr-2`} />
                      <h4 className="font-semibold text-white">{merchant.name}</h4>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{merchant.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                        {merchant.category}
                      </span>
                      {selectedMerchantId === merchant.id && (
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Selected
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Register Merchant Button */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowMerchantForm(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 inline-flex items-center"
                >
                  <Store className="w-4 h-4 mr-2" />
                  Register as Merchant
                </button>
              </div>
            </div>
          </div>

          {/* Merchant Registration Form Modal */}
          {showMerchantForm && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <Store className="w-5 h-5 mr-2 text-purple-400" />
                    Register New Merchant
                  </h3>
                  <button
                    onClick={() => setShowMerchantForm(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleMerchantSubmit} className="space-y-4">
                  <div>
                    <label className="text-white text-sm font-semibold mb-2 block">
                      Store Name
                    </label>
                    <input
                      type="text"
                      value={newMerchant.name}
                      onChange={(e) => setNewMerchant(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your store name"
                      required
                      className="w-full px-4 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-white text-sm font-semibold mb-2 block">
                      Store Description
                    </label>
                    <textarea
                      value={newMerchant.description}
                      onChange={(e) => setNewMerchant(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your business"
                      required
                      className="w-full px-4 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-white text-sm font-semibold mb-2 block">
                      Category
                    </label>
                    <select
                      value={newMerchant.category}
                      onChange={(e) => setNewMerchant(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Food & Beverages">Food & Beverages</option>
                      <option value="Technology">Technology</option>
                      <option value="Art">Art</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Services">Services</option>
                      <option value="Entertainment">Entertainment</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-400">Connected Wallet:</span>
                      {activeAccount ? (
                        <span className="text-green-400 text-sm font-mono">
                          {activeAccount.address.slice(0,6)}...{activeAccount.address.slice(-4)}
                        </span>
                      ) : (
                        <span className="text-red-400 text-sm">Not Connected</span>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={!activeAccount}
                      className={`w-full py-3 rounded-lg font-bold transition-all duration-200 ${
                        !activeAccount
                          ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                          : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                      }`}
                    >
                      {!activeAccount ? (
                        'Connect Wallet to Register'
                      ) : (
                        <div className="flex items-center justify-center">
                          <Store className="w-5 h-5 mr-2" />
                          Register Store
                        </div>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 rounded-lg border border-red-500/50 max-w-md mx-auto">
              <AlertCircle className="w-4 h-4 inline mr-2 text-red-400" />
              <span className="text-red-300 text-sm">{error}</span>
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
                  title: "Connect to Testnet",
                  size: "wide",
                  titleIcon: "",
                  showThirdwebBranding: false,
                }}
                chains={[networks.polygonMumbai.chain, networks.sepolia.chain]}
                switchButton={{
                  label: "Switch Network",
                  style: {
                    backgroundColor: "#4f46e5",
                  },
                }}
                onConnect={async (wallet) => {
                  try {
                    // Try to switch to the selected network
                    const networkConfig = networks[selectedNetwork];
                    if (wallet && networkConfig) {
                      await wallet.switchChain(networkConfig.chain);
                    }
                  } catch (error) {
                    console.error('Failed to switch network:', error);
                    setError('Failed to switch network. Please try manually.');
                  }
                }}
              />
              {activeAccount && (
                <div className="mt-4 p-3 bg-green-500/20 rounded-lg">
                  <div className="w-full overflow-hidden">
                    <p className="text-green-300 text-sm truncate" title={activeAccount.address}>
                      Connected: {activeAccount.address}
                    </p>
                  </div>
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

              {/* NFC Card Creation Tools */}
              <div className="border-t border-gray-600 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Create NFC Payment Card
                </h3>
                
                {/* Customer Wallet Input */}
                <div className="mb-4">
                  <label className="text-white text-sm font-semibold mb-2 block flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Customer Wallet Address
                  </label>
                  <input
                    type="text"
                    value={customerWalletForNFC}
                    onChange={(e) => setCustomerWalletForNFC(e.target.value)}
                    placeholder="0x... (customer's wallet address)"
                    className="w-full px-4 py-3 bg-black/40 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    This will be written to the NFC card for the customer
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={writeNFCTag}
                    disabled={isWritingNFC || !customerWalletForNFC.trim()}
                    className={`flex-1 px-4 py-3 rounded-lg transition-colors text-sm font-semibold whitespace-nowrap ${
                      isWritingNFC || !customerWalletForNFC.trim()
                        ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                    }`}
                  >
                    {isWritingNFC ? (
                      <div className="flex items-center justify-center">
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Writing NFC...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Write x402 NFC Card
                      </div>
                    )}
                  </button>
                  
                  <button
                    onClick={async () => {
                      // Only proceed if wallet is connected
                      if (!activeAccount) {
                        setError('Please connect your wallet first to simulate a tap');
                        return;
                      }
                      
                      const demoPaymentData = {
                        userWallet: activeAccount.address,
                        merchantAddress: merchantInfo.address,
                        protocol: 'x402',
                        network: selectedNetwork
                      };
                      
                      setPaymentData(demoPaymentData);
                      setCurrentStep('payment');
                    }}
                    disabled={!activeAccount}
                    className={`flex-1 px-4 py-2 ${!activeAccount 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                    } text-white rounded-lg transition-colors text-sm font-semibold whitespace-nowrap`}
                  >
                    Simulate x402 Tap
                  </button>
                </div>
                
                <p className="text-gray-400 text-xs text-center mt-2">
                  💡 Real NFC card will auto-connect customer wallet to this merchant terminal
                </p>
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
                  <label className="text-green-400 text-sm font-semibold flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Customer Wallet (from NFC)
                  </label>
                  <div className="flex items-center mt-2 w-full">
                    <Wallet className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-white font-mono text-sm truncate" title={paymentData.userWallet}>
                        {paymentData.userWallet}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-gray-400 text-xs">Connected to {networks[selectedNetwork].name}</p>
                    {paymentData.userWallet === activeAccount?.address ? (
                      <span className="px-2 py-1 bg-green-500/20 rounded text-green-300 text-xs flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Wallet Connected
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-500/20 rounded text-yellow-300 text-xs flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Connect Required
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Merchant Info */}
              <div className="bg-black/40 rounded-lg p-4 mb-6">
                <label className="text-blue-400 text-sm font-semibold">Merchant</label>
                <p className="text-white font-semibold">{merchantInfo.name}</p>
                <div className="w-full overflow-hidden">
                  <p className="text-gray-400 font-mono text-sm truncate" title={merchantInfo.address}>
                    {merchantInfo.address}
                  </p>
                </div>
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

              {/* Wallet Connection Status */}
              {paymentData && paymentData.userWallet !== activeAccount?.address && (
                <div className="bg-yellow-500/20 rounded-lg p-4 mb-6 border border-yellow-500/30">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
                    <span className="text-yellow-300 font-semibold">Wallet Connection Required</span>
                  </div>
                  <p className="text-yellow-200 text-sm mb-3">
                    The NFC card belongs to: <span className="font-mono">{paymentData.userWallet.slice(0,8)}...{paymentData.userWallet.slice(-6)}</span>
                  </p>
                  <p className="text-yellow-200 text-sm">
                    Please connect this wallet or ask the customer to approve the transaction.
                  </p>
                </div>
              )}

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
                
                {/* Transaction Details */}
                {paymentData && merchantInfo.amount && (
                  <div className="bg-black/40 rounded-lg p-4 mt-6">
                    <h4 className="text-white font-semibold mb-3">Transaction Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">From:</span>
                        <span className="text-white font-mono">{activeAccount?.address.slice(0,8)}...{activeAccount?.address.slice(-6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">To:</span>
                        <span className="text-white font-mono">{merchantInfo.address.slice(0,8)}...{merchantInfo.address.slice(-6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount:</span>
                        <span className="text-white font-semibold">{merchantInfo.amount} {networks[selectedNetwork].currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Network:</span>
                        <span className="text-white">{networks[selectedNetwork].name}</span>
                      </div>
                    </div>
                  </div>
                )}
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
                    <p className="text-blue-400 font-mono text-sm mr-2 break-all">{transactionHash.slice(0, 20)}...{transactionHash.slice(-10)}</p>
                    <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  </div>
                  
                  {/* Customer & Payment Info */}
                  {paymentData && (
                    <div className="border-t border-gray-600 pt-4 mb-4">
                      <h4 className="text-white font-semibold mb-2">Payment Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Customer:</span>
                          <span className="text-green-300 font-mono">{paymentData.userWallet.slice(0,8)}...{paymentData.userWallet.slice(-6)}</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-gray-400">Merchant:</span>
                          <div className="text-right">
                            <span className="text-blue-300 block">{merchantInfo.name}</span>
                            <span className="text-xs text-gray-500">
                              {merchants.find(m => m.id === selectedMerchantId)?.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Protocol:</span>
                          <span className="text-purple-300">x402</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-600">
                    <p className="text-white font-semibold">{merchantInfo.amount} {networks[selectedNetwork].currency} sent to {merchantInfo.name}</p>
                    <p className="text-gray-400 text-sm">Network: {networks[selectedNetwork].name}</p>
                    {merchantInfo.orderId && (
                      <p className="text-gray-400 text-sm">Order: {merchantInfo.orderId}</p>
                    )}
                    {x402PaymentId && (
                      <p className="text-gray-400 text-sm">x402 ID: {x402PaymentId}</p>
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
              Multi-chain payments • NFC Integration • Auto-Connect • TypeScript
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <span className="px-2 py-1 bg-purple-600/30 rounded text-purple-300 whitespace-nowrap">Polygon</span>
              <span className="px-2 py-1 bg-blue-600/30 rounded text-blue-300 whitespace-nowrap">Sepolia</span>
              <span className="px-2 py-1 bg-green-600/30 rounded text-green-300 whitespace-nowrap">Native Tokens</span>
              <span className="px-2 py-1 bg-orange-600/30 rounded text-orange-300 whitespace-nowrap">x402 Protocol</span>
            </div>
            
            {/* Quick Guide */}
            <div className="mt-4 pt-4 border-t border-gray-500/20">
              <h4 className="text-white font-semibold text-sm mb-2">How it works:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-300">
                <div className="flex items-center">
                  <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-2">1</span>
                  Write customer wallet to NFC
                </div>
                <div className="flex items-center">
                  <span className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-2">2</span>
                  Customer taps NFC card
                </div>
                <div className="flex items-center">
                  <span className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white font-bold mr-2">3</span>
                  Auto-connect & pay
                </div>
              </div>
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