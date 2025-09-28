'use client';
import React, { useState, useEffect } from 'react';
import { Nfc, CreditCard, ShoppingCart, CheckCircle, AlertCircle, Loader, Smartphone, Wallet, ExternalLink, DollarSign, Zap, Network, User, Settings, Bot, Code, Globe } from 'lucide-react';
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { polygon, sepolia } from "thirdweb/chains";
import { ConnectButton, useActiveAccount, useActiveWallet, useConnect, useDisconnect } from "thirdweb/react";

// x402 Protocol Types
interface X402PaymentRequirement {
  amount: string;
  currency: string;
  recipient: string;
  metadata?: {
    orderId?: string;
    description?: string;
    agentId?: string;
  };
}

interface X402PaymentResponse {
  paymentId: string;
  transactionHash: string;
  amount: string;
  currency: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
}

interface X402AgentConfig {
  agentId: string;
  name: string;
  description: string;
  serviceUrl: string;
  pricePerRequest: string;
  supportedChains: string[];
  x402Enabled: boolean;
}

type PaymentData = {
  userWallet: string;
  merchantAddress: string;
  protocol?: string;
  network?: string;
  agentId?: string;
};

type MerchantInfo = {
  name: string;
  address: string;
  orderId: string;
  amount: string;
  currency: string;
  x402Endpoint?: string;
};

// Initialize Thirdweb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "042852d11c6ddb740ca35a62807f77c3",
});

// Polygon Amoy Network Configuration (Official Testnet)
const polygonAmoy = {
  id: 80002,
  name: "Polygon Amoy",
  currency: "POL",
  chain: {
    id: 80002,
    name: "Polygon Amoy Testnet",
    nativeCurrency: {
      name: "POL",
      symbol: "POL", 
      decimals: 18
    },
    rpc: [
      "https://rpc-amoy.polygon.technology/",
      "https://polygon-amoy-bor-rpc.publicnode.com",
      "https://polygon-amoy.drpc.org"
    ],
    blockExplorers: {
      default: {
        name: "Amoy PolygonScan",
        url: "https://amoy.polygonscan.com"
      }
    },
    testnet: true,
    faucets: ["https://faucet.polygon.technology/"]
  },
  explorerUrl: "https://amoy.polygonscan.com"
};

// Sample AI Agents with x402 Integration
const sampleAgents: X402AgentConfig[] = [
  {
    agentId: "ai-analyst-001",
    name: "Market Analysis Agent",
    description: "Real-time crypto market analysis and trading insights",
    serviceUrl: "https://api.agent-market.x402.demo/analyze",
    pricePerRequest: "0.01",
    supportedChains: ["80002"],
    x402Enabled: true
  },
  {
    agentId: "defi-advisor-002", 
    name: "DeFi Strategy Agent",
    description: "Personalized DeFi portfolio optimization and yield farming strategies",
    serviceUrl: "https://api.defi-advisor.x402.demo/optimize",
    pricePerRequest: "0.05",
    supportedChains: ["80002"],
    x402Enabled: true
  },
  {
    agentId: "nft-curator-003",
    name: "NFT Curator Agent",
    description: "AI-powered NFT collection curation and valuation",
    serviceUrl: "https://api.nft-curator.x402.demo/curate",
    pricePerRequest: "0.02",
    supportedChains: ["80002"],
    x402Enabled: true
  }
];

const X402PaymentApp = () => {
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [currentStep, setCurrentStep] = useState('agent-select');
  const [selectedAgent, setSelectedAgent] = useState<X402AgentConfig | null>(null);
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo>({
    name: 'x402 Agent Payment Gateway',
    address: '0x2fF9c787761Ff79a30574b51f1C83d21510Fbc0e',
    orderId: '',
    amount: '',
    currency: 'POL',
    x402Endpoint: 'https://api.x402-gateway.polygon.demo/'
  });
  const [transactionHash, setTransactionHash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [x402PaymentId, setX402PaymentId] = useState('');
  const [error, setError] = useState('');
  const [isWritingNFC, setIsWritingNFC] = useState(false);
  const [customerWalletForNFC, setCustomerWalletForNFC] = useState('');
  const [x402Response, setX402Response] = useState<X402PaymentResponse | null>(null);

  // Thirdweb hooks
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();

  // x402 Protocol Implementation
  const createX402PaymentRequest = async (agent: X402AgentConfig, amount: string): Promise<X402PaymentRequirement> => {
    const paymentReq: X402PaymentRequirement = {
      amount: amount,
      currency: 'POL',
      recipient: merchantInfo.address,
      metadata: {
        orderId: `x402-${Date.now()}`,
        description: `Payment for ${agent.name} service`,
        agentId: agent.agentId
      }
    };
    
    console.log('Created x402 Payment Requirement:', paymentReq);
    return paymentReq;
  };

  const processX402Payment = async (paymentReq: X402PaymentRequirement): Promise<X402PaymentResponse> => {
    if (!activeAccount) {
      throw new Error('Wallet not connected');
    }

    // Simulate x402 protocol interaction
    const response: X402PaymentResponse = {
      paymentId: `x402_${Date.now()}`,
      transactionHash: '', // Will be filled after blockchain transaction
      amount: paymentReq.amount,
      currency: paymentReq.currency,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    console.log('Processing x402 Payment:', response);
    return response;
  };

  // Check for URL parameters and NFC support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setNfcSupported(true);
    }

    // Parse URL parameters for payment data
    const urlParams = new URLSearchParams(window.location.search);
    const walletFromUrl = urlParams.get('wallet');
    const merchantFromUrl = urlParams.get('merchant');
    const agentIdFromUrl = urlParams.get('agentId');
    
    if (walletFromUrl) {
      setPaymentData({
        userWallet: walletFromUrl,
        merchantAddress: merchantFromUrl || merchantInfo.address,
        protocol: 'x402',
        network: 'amoy',
        agentId: agentIdFromUrl || undefined
      });
      
      // Set agent if specified
      if (agentIdFromUrl) {
        const agent = sampleAgents.find(a => a.agentId === agentIdFromUrl);
        if (agent) {
          setSelectedAgent(agent);
          setMerchantInfo(prev => ({ 
            ...prev, 
            amount: agent.pricePerRequest,
            name: agent.name
          }));
          setCurrentStep('payment');
        }
      } else {
        setCurrentStep('payment');
      }
      
      console.log('Payment data loaded from URL:', { walletFromUrl, merchantFromUrl, agentIdFromUrl });
    }
  }, []);

  // Auto-connect wallet when payment data is detected
  useEffect(() => {
    if (paymentData && !activeAccount) {
      console.log('Payment data detected, attempting auto-connect...');
      requestWalletConnection();
    }
  }, [paymentData, activeAccount]);

  const requestWalletConnection = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        if (accounts.length > 0) {
          console.log('Wallet connected automatically:', accounts[0]);
          await switchToAmoyNetwork();
        }
      }
    } catch (error) {
      console.error('Auto-connect failed:', error);
      setError('Please connect your wallet manually to proceed');
    }
  };

  const switchToAmoyNetwork = async () => {
    if (!window.ethereum) return;
    
    try {
      const chainIdHex = `0x${polygonAmoy.id.toString(16)}`;
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: chainIdHex,
                chainName: polygonAmoy.chain.name,
                nativeCurrency: polygonAmoy.chain.nativeCurrency,
                rpcUrls: polygonAmoy.chain.rpc,
                blockExplorerUrls: [polygonAmoy.explorerUrl],
                iconUrls: ["https://wallet-asset.matic.network/img/tokens/pol.svg"]
              }]
            });
          } catch (addError) {
            console.error('Failed to add Polygon Amoy network:', addError);
            setError('Failed to add Polygon Amoy network to wallet');
            return;
          }
        } else {
          throw switchError;
        }
      }
      
    } catch (error: any) {
      console.error('Failed to switch to Polygon Amoy:', error);
      setError(error.message || 'Failed to switch to Polygon Amoy network');
    }
  };

  // NFC Reading Function with x402 support
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
      
      ndef.addEventListener("reading", async (event) => {
        for (const record of event.message.records) {
          if (record.recordType === "url") {
            const decoder = new TextDecoder();
            const url = decoder.decode(record.data);
            
            try {
              const urlObj = new URL(url);
              const wallet = urlObj.searchParams.get('wallet');
              const merchant = urlObj.searchParams.get('merchant');
              const agentId = urlObj.searchParams.get('agentId');
              
              if (wallet) {
                setPaymentData({
                  userWallet: wallet,
                  merchantAddress: merchant || merchantInfo.address,
                  protocol: 'x402',
                  network: 'amoy',
                  agentId: agentId || undefined
                });
                
                // Set agent if specified
                if (agentId) {
                  const agent = sampleAgents.find(a => a.agentId === agentId);
                  if (agent) {
                    setSelectedAgent(agent);
                    setMerchantInfo(prev => ({ 
                      ...prev, 
                      amount: agent.pricePerRequest,
                      name: agent.name
                    }));
                  }
                }
                
                // Auto-connect wallet
                if (!activeAccount && window.ethereum) {
                  try {
                    const accounts = await window.ethereum.request({
                      method: 'eth_requestAccounts'
                    });
                    
                    await switchToAmoyNetwork();
                    console.log('Wallet connected via x402 NFC:', accounts[0]);
                  } catch (error) {
                    console.error('Wallet connection failed:', error);
                    setError('Please connect your wallet manually');
                  }
                }
                
                setCurrentStep('payment');
              }
            } catch (e) {
              console.error('Invalid x402 NFC data:', e);
              setError('Invalid x402 NFC card data');
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

  // Write NFC Tag with x402 agent payment data
  const writeNFCTag = async () => {
    if (!nfcSupported) {
      alert('NFC is not supported on this device/browser');
      return;
    }

    if (!customerWalletForNFC.trim() || !selectedAgent) {
      setError('Please enter customer wallet address and select an agent first');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(customerWalletForNFC.trim())) {
      setError('Invalid wallet address format');
      return;
    }

    setIsWritingNFC(true);
    setError('');

    try {
      const ndef = new (window as any).NDEFReader();
      
      const customerWallet = customerWalletForNFC.trim();
      const baseUrl = `${window.location.origin}`;
      const paymentUrl = `${baseUrl}?wallet=${customerWallet}&merchant=${merchantInfo.address}&protocol=x402&network=amoy&agentId=${selectedAgent.agentId}`;
      
      const x402PaymentData = {
        customerWallet: customerWallet,
        merchant: merchantInfo.address,
        protocol: "x402",
        network: "amoy",
        agentId: selectedAgent.agentId,
        agentName: selectedAgent.name,
        pricePerRequest: selectedAgent.pricePerRequest,
        serviceUrl: selectedAgent.serviceUrl,
        
        // x402 Protocol Metadata
        type: "x402-agent-payment-card",
        version: "1.2",
        created: new Date().toISOString(),
        chain: "polygon-amoy",
        chainId: polygonAmoy.id,
        currency: "POL",
        
        // Agent & x402 Features
        features: [
          "x402-protocol",
          "agent-payments", 
          "auto-connect",
          "polygon-amoy",
          "instant-settlement"
        ]
      };
      
      console.log('Writing x402 NFC with agent data:', x402PaymentData);
      
      await ndef.write({
        records: [
          { recordType: "url", data: paymentUrl },
          { recordType: "text", data: JSON.stringify(x402PaymentData) }
        ]
      });
      
      setIsWritingNFC(false);
      alert(`✅ x402 Agent Payment Card Created!\n\nAgent: ${selectedAgent.name}\nCustomer: ${customerWallet.slice(0,8)}...${customerWallet.slice(-6)}\nPrice: ${selectedAgent.pricePerRequest} POL\nNetwork: Polygon Amoy`);
      
      setCustomerWalletForNFC('');
      
    } catch (error: any) {
      console.log("Error writing x402 NFC tag:", error);
      setIsWritingNFC(false);
      setError(error.message || "Error writing to NFC tag. Make sure you have a writable NTAG card nearby.");
    }
  };

  // Process x402 Agent Payment
  const processX402AgentPayment = async () => {
    if (!merchantInfo.amount || !activeAccount || !selectedAgent) {
      setError('Please connect wallet, select agent, and enter payment amount');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('confirm');
    setError('');

    try {
      console.log('Processing x402 agent payment...');
      
      // Step 1: Create x402 Payment Requirement
      const paymentReq = await createX402PaymentRequest(selectedAgent, merchantInfo.amount);
      
      // Step 2: Process x402 Payment Response
      const x402Resp = await processX402Payment(paymentReq);
      setX402Response(x402Resp);
      setX402PaymentId(x402Resp.paymentId);

      // Step 3: Execute blockchain transaction on Polygon Amoy
      const amountInWei = BigInt(Math.floor(parseFloat(merchantInfo.amount) * 1e18));
      
      const transactionData = {
        to: merchantInfo.address,
        value: amountInWei,
        chain: polygonAmoy.chain,
        client: client
      };

      console.log('Executing x402 transaction on Polygon Amoy:', {
        from: activeAccount.address,
        to: merchantInfo.address,
        amount: merchantInfo.amount + ' POL',
        agent: selectedAgent.name,
        x402PaymentId: x402Resp.paymentId
      });

      const result = await sendTransaction({
        transaction: transactionData,
        account: activeAccount
      });

      console.log('x402 transaction completed:', result);
      
      // Update x402 response with transaction hash
      const finalResponse = {
        ...x402Resp,
        transactionHash: result.transactionHash,
        status: 'confirmed' as const
      };
      
      setX402Response(finalResponse);
      setTransactionHash(result.transactionHash);
      setCurrentStep('success');
      setIsProcessing(false);

    } catch (error: any) {
      console.error('x402 payment failed:', error);
      setError(error.message || 'x402 transaction failed. Please try again.');
      setIsProcessing(false);
      setCurrentStep('payment');
    }
  };

  const resetFlow = () => {
    setCurrentStep('agent-select');
    setSelectedAgent(null);
    setPaymentData(null);
    setTransactionHash('');
    setX402PaymentId('');
    setX402Response(null);
    setError('');
    setMerchantInfo(prev => ({ 
      ...prev, 
      orderId: '', 
      amount: '',
      name: 'x402 Agent Payment Gateway'
    }));
    
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
            <Bot className="w-12 h-12 text-purple-400 mr-3" />
            <Code className="w-8 h-8 text-green-400 mr-2" />
            <Globe className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
            x402 Agentic Payments
          </h1>
          <p className="text-blue-200 mb-2">AI Agent Payment Terminal • Polygon Amoy</p>
          <div className="flex flex-wrap justify-center items-center gap-2 text-sm px-4">
            <span className="px-3 py-1 bg-purple-600/50 rounded-full text-purple-200 whitespace-nowrap">x402 Protocol</span>
            <span className="px-3 py-1 bg-green-600/50 rounded-full text-green-200 whitespace-nowrap">Polygon Amoy</span>
            <span className="px-3 py-1 bg-blue-600/50 rounded-full text-blue-200 whitespace-nowrap">Agent Payments</span>
            <span className="px-3 py-1 bg-orange-600/50 rounded-full text-orange-200 whitespace-nowrap">HTTP 402</span>
          </div>
          
          {/* Network Status */}
          <div className="mt-4 flex justify-center">
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-gray-500/30">
              <div className="flex items-center">
                <Network className="w-5 h-5 text-green-400 mr-2" />
                <span className="text-white font-semibold">Polygon Amoy Testnet</span>
                <span className="ml-2 px-2 py-1 bg-green-500/20 rounded text-green-300 text-xs">ACTIVE</span>
              </div>
              <p className="text-gray-400 text-xs mt-1">Chain ID: {polygonAmoy.id} • Currency: POL</p>
            </div>
          </div>

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
              <h3 className="text-lg font-semibold text-white mb-4">Connect to Polygon Amoy</h3>
              <ConnectButton
                client={client}
                theme="dark"
                connectModal={{
                  title: "Connect to Polygon Amoy",
                  size: "wide",
                  titleIcon: "",
                  showThirdwebBranding: false,
                }}
                chains={[polygonAmoy.chain]}
                switchButton={{
                  label: "Switch to Polygon Amoy",
                  style: {
                    backgroundColor: "#8b5cf6",
                  },
                }}
                onConnect={async (wallet) => {
                  try {
                    await wallet.switchChain(polygonAmoy.chain);
                  } catch (error) {
                    console.error('Failed to switch to Polygon Amoy:', error);
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
                  <p className="text-green-400 text-xs">Network: Polygon Amoy Testnet</p>
                </div>
              )}
            </div>
          </div>

          {/* Step 1: Agent Selection */}
          {currentStep === 'agent-select' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Select AI Agent Service
              </h2>
              
              <div className="space-y-4 mb-6">
                {sampleAgents.map((agent) => (
                  <div
                    key={agent.agentId}
                    onClick={() => {
                      setSelectedAgent(agent);
                      setMerchantInfo(prev => ({ 
                        ...prev, 
                        amount: agent.pricePerRequest,
                        name: agent.name
                      }));
                    }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedAgent?.agentId === agent.agentId
                        ? 'border-purple-500/50 bg-purple-900/30'
                        : 'border-gray-600/30 bg-black/20 hover:border-purple-500/30 hover:bg-purple-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <Bot className="w-5 h-5 text-purple-400 mr-2" />
                          <h3 className="text-white font-semibold">{agent.name}</h3>
                          {agent.x402Enabled && (
                            <span className="ml-2 px-2 py-1 bg-green-500/20 rounded text-green-300 text-xs">x402</span>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{agent.description}</p>
                        <div className="flex items-center text-xs text-gray-400">
                          <DollarSign className="w-3 h-3 mr-1" />
                          <span className="mr-3">{agent.pricePerRequest} POL per request</span>
                          <Globe className="w-3 h-3 mr-1" />
                          <span>Polygon Amoy</span>
                        </div>
                      </div>
                      {selectedAgent?.agentId === agent.agentId && (
                        <CheckCircle className="w-6 h-6 text-purple-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => selectedAgent ? setCurrentStep('nfc-setup') : null}
                  disabled={!selectedAgent}
                  className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                    selectedAgent
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transform hover:scale-105'
                      : 'bg-gray-600 cursor-not-allowed text-gray-400'
                  }`}
                >
                  Continue to NFC Setup
                </button>
                
                <button
                  onClick={() => {
                    if (!selectedAgent) {
                      setError('Please select an agent first');
                      return;
                    }
                    if (!activeAccount) {
                      setError('Please connect your wallet first');
                      return;
                    }
                    
                    const demoPaymentData = {
                      userWallet: activeAccount.address,
                      merchantAddress: merchantInfo.address,
                      protocol: 'x402',
                      network: 'amoy',
                      agentId: selectedAgent.agentId
                    };
                    
                    setPaymentData(demoPaymentData);
                    setCurrentStep('payment');
                  }}
                  disabled={!selectedAgent || !activeAccount}
                  className={`w-full py-3 ${!selectedAgent || !activeAccount 
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400' 
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                  } rounded-lg transition-colors font-semibold`}
                >
                  Skip to Direct Payment
                </button>
              </div>
            </div>
          )}

          {/* Step 2: NFC Setup */}
          {currentStep === 'nfc-setup' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/30">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                NFC Payment Card Setup
              </h2>
              
              {selectedAgent && (
                <div className="bg-purple-900/30 rounded-lg p-4 mb-6 border border-purple-500/30">
                  <div className="flex items-center mb-2">
                    <Bot className="w-5 h-5 text-purple-400 mr-2" />
                    <h3 className="text-white font-semibold">{selectedAgent.name}</h3>
                    <span className="ml-2 px-2 py-1 bg-green-500/20 rounded text-green-300 text-xs">Selected</span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{selectedAgent.description}</p>
                  <div className="flex items-center text-xs text-gray-400">
                    <DollarSign className="w-3 h-3 mr-1" />
                    <span>{selectedAgent.pricePerRequest} POL per request</span>
                  </div>
                </div>
              )}

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
                  {nfcReading ? 'Scanning for x402 payment card...' : 'Ready to scan x402 NFC payment card'}
                </p>

                <button
                  onClick={startNFCReading}
                  disabled={nfcReading}
                  className={`px-8 py-4 rounded-lg font-semibold transition-all duration-200 mb-4 ${
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
                  Create x402 Agent Payment Card
                </h3>
                
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
                    This will be programmed into the NFC card for automatic agent payments
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={writeNFCTag}
                    disabled={isWritingNFC || !customerWalletForNFC.trim() || !selectedAgent}
                    className={`flex-1 px-4 py-3 rounded-lg transition-colors text-sm font-semibold whitespace-nowrap ${
                      isWritingNFC || !customerWalletForNFC.trim() || !selectedAgent
                        ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                    }`}
                  >
                    {isWritingNFC ? (
                      <div className="flex items-center justify-center">
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Writing x402 NFC...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Write x402 Agent Card
                      </div>
                    )}
                  </button>
                </div>
                
                <p className="text-gray-400 text-xs text-center mt-2">
                  Agent payment card will auto-connect to {selectedAgent?.name} service
                </p>
              </div>

              <div className="text-center mt-6">
                <button
                  onClick={() => setCurrentStep('agent-select')}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  ← Back to Agent Selection
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment Details */}
          {currentStep === 'payment' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-green-500/30">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                x402 Agent Payment
              </h2>

              {/* x402 Protocol Status */}
              <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-3 mb-6 border border-purple-500/30">
                <div className="flex items-center justify-center">
                  <Code className="w-5 h-5 text-purple-400 mr-2" />
                  <span className="text-white font-semibold">x402 Protocol Active</span>
                  <span className="ml-2 px-2 py-1 bg-green-500/20 rounded text-green-300 text-xs">HTTP 402</span>
                </div>
              </div>

              {/* Selected Agent Info */}
              {selectedAgent && (
                <div className="bg-purple-900/30 rounded-lg p-4 mb-6 border border-purple-500/30">
                  <div className="flex items-center mb-2">
                    <Bot className="w-5 h-5 text-purple-400 mr-2" />
                    <h3 className="text-white font-semibold">{selectedAgent.name}</h3>
                    <span className="ml-auto px-2 py-1 bg-green-500/20 rounded text-green-300 text-xs">x402 Enabled</span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{selectedAgent.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Agent ID: {selectedAgent.agentId}</span>
                    <span className="text-green-400 font-semibold">{selectedAgent.pricePerRequest} POL</span>
                  </div>
                </div>
              )}

              {/* Customer Wallet */}
              {paymentData && (
                <div className="bg-black/40 rounded-lg p-4 mb-6">
                  <label className="text-green-400 text-sm font-semibold flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Customer Wallet (from x402 NFC)
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
                    <p className="text-gray-400 text-xs">Connected to Polygon Amoy</p>
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

              {/* Payment Amount */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-white text-sm font-semibold">Agent Service Fee</label>
                  <div className="flex mt-2">
                    <input
                      type="number"
                      step="0.000001"
                      value={merchantInfo.amount}
                      onChange={(e) => setMerchantInfo(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder={selectedAgent?.pricePerRequest || "0.01"}
                      className="flex-1 px-4 py-3 bg-black/40 border border-gray-600 rounded-l-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="px-4 py-3 bg-gradient-to-r from-purple-700 to-blue-700 border border-gray-600 rounded-r-lg text-white font-semibold">
                      POL
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    Recommended: {selectedAgent?.pricePerRequest || "0.01"} POL per request
                  </p>
                </div>

                <div>
                  <label className="text-white text-sm font-semibold">Request ID</label>
                  <input
                    type="text"
                    value={merchantInfo.orderId}
                    onChange={(e) => setMerchantInfo(prev => ({ ...prev, orderId: e.target.value }))}
                    placeholder="AUTO_GENERATED"
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
                    The x402 NFC card belongs to: <span className="font-mono">{paymentData.userWallet.slice(0,8)}...{paymentData.userWallet.slice(-6)}</span>
                  </p>
                  <p className="text-yellow-200 text-sm">
                    Please connect this wallet or ask the customer to approve the transaction.
                  </p>
                </div>
              )}

              {/* x402 Payment Button */}
              <button
                onClick={processX402AgentPayment}
                disabled={!merchantInfo.amount || !activeAccount || !selectedAgent || isProcessing}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 ${
                  !merchantInfo.amount || !activeAccount || !selectedAgent
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400' 
                    : 'bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 hover:from-purple-700 hover:via-blue-700 hover:to-green-700 text-white transform hover:scale-105'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Processing x402 Payment...
                  </div>
                ) : !activeAccount ? (
                  'Connect Wallet First'
                ) : !selectedAgent ? (
                  'Select Agent First'
                ) : (
                  <div className="flex items-center justify-center">
                    <Code className="w-5 h-5 mr-2" />
                    Pay {merchantInfo.amount} POL via x402
                  </div>
                )}
              </button>

              <div className="text-center mt-4">
                <button
                  onClick={() => setCurrentStep('agent-select')}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  ← Back to Agent Selection
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 'confirm' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/30">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Processing x402 Payment
              </h2>

              <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 rounded-lg p-3 mb-6 border border-yellow-500/30">
                <div className="flex items-center justify-center">
                  <Loader className="w-5 h-5 text-yellow-400 mr-2 animate-spin" />
                  <span className="text-white font-semibold">x402 Protocol Processing</span>
                </div>
              </div>

              <div className="text-center">
                <div className="relative">
                  <Code className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                  <div className="absolute inset-0 w-12 h-12 mx-auto border-2 border-orange-400 rounded-full animate-ping"></div>
                </div>
                <p className="text-yellow-400 font-semibold">Processing agent payment on Polygon Amoy...</p>
                <p className="text-gray-400 text-sm">x402 HTTP 402 Payment Required</p>
                
                {/* Transaction Details */}
                {paymentData && merchantInfo.amount && selectedAgent && (
                  <div className="bg-black/40 rounded-lg p-4 mt-6">
                    <h4 className="text-white font-semibold mb-3">x402 Transaction Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Agent:</span>
                        <span className="text-purple-300">{selectedAgent.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Customer:</span>
                        <span className="text-white font-mono">{activeAccount?.address.slice(0,8)}...{activeAccount?.address.slice(-6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Payment:</span>
                        <span className="text-white font-semibold">{merchantInfo.amount} POL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Protocol:</span>
                        <span className="text-green-300">x402</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Network:</span>
                        <span className="text-white">Polygon Amoy</span>
                      </div>
                      {x402Response && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">x402 ID:</span>
                          <span className="text-blue-300 font-mono">{x402Response.paymentId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {currentStep === 'success' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-green-500/30">
              <div className="text-center">
                <div className="relative mb-6">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
                  <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-green-400 rounded-full animate-ping"></div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">x402 Payment Successful!</h2>
                
                <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-lg p-3 mb-6 border border-green-500/30">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                    <span className="text-white font-semibold">x402 Agent Payment Completed</span>
                    <span className="ml-2 px-2 py-1 bg-green-500/20 rounded text-green-300 text-xs">SUCCESS</span>
                  </div>
                </div>
                
                <div className="bg-black/40 rounded-lg p-6 mb-6">
                  <p className="text-gray-400 text-sm mb-2">Transaction Hash:</p>
                  <div className="flex items-center justify-center mb-4">
                    <p className="text-blue-400 font-mono text-sm mr-2 break-all">{transactionHash.slice(0, 20)}...{transactionHash.slice(-10)}</p>
                    <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  </div>
                  
                  {/* x402 Response Details */}
                  {x402Response && selectedAgent && (
                    <div className="border-t border-gray-600 pt-4 mb-4">
                      <h4 className="text-white font-semibold mb-2">x402 Payment Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">x402 Payment ID:</span>
                          <span className="text-blue-300 font-mono">{x402Response.paymentId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Agent Service:</span>
                          <span className="text-purple-300">{selectedAgent.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className="text-green-300">{x402Response.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Timestamp:</span>
                          <span className="text-gray-300">{new Date(x402Response.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-600">
                    <p className="text-white font-semibold">{merchantInfo.amount} POL paid to {selectedAgent?.name || 'Agent'}</p>
                    <p className="text-gray-400 text-sm">Network: Polygon Amoy Testnet</p>
                    <p className="text-gray-400 text-sm">Protocol: x402 (HTTP 402)</p>
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
                    onClick={() => window.open(`${polygonAmoy.explorerUrl}/tx/${transactionHash}`, '_blank')}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    View on Amoy
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
                <Code className="w-6 h-6 text-purple-400 mr-2" />
                <span className="text-white font-bold text-lg">Powered by x402 Protocol</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-2">
              Agentic Payments • HTTP 402 • Polygon Amoy • Auto-Connect • TypeScript
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <span className="px-2 py-1 bg-purple-600/30 rounded text-purple-300 whitespace-nowrap">x402</span>
              <span className="px-2 py-1 bg-green-600/30 rounded text-green-300 whitespace-nowrap">Polygon Amoy</span>
              <span className="px-2 py-1 bg-blue-600/30 rounded text-blue-300 whitespace-nowrap">Agent Services</span>
              <span className="px-2 py-1 bg-orange-600/30 rounded text-orange-300 whitespace-nowrap">HTTP 402</span>
            </div>
            
            {/* x402 Info */}
            <div className="mt-4 pt-4 border-t border-gray-500/20">
              <h4 className="text-white font-semibold text-sm mb-2">x402 Protocol Flow:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs text-gray-300">
                <div className="flex items-center">
                  <span className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-2">1</span>
                  Select AI Agent
                </div>
                <div className="flex items-center">
                  <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-2">2</span>
                  NFC Tap/Connect
                </div>
                <div className="flex items-center">
                  <span className="w-5 h-5 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold mr-2">3</span>
                  x402 Processing
                </div>
                <div className="flex items-center">
                  <span className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white font-bold mr-2">4</span>
                  Agent Service Ready
                </div>
              </div>
              <div className="mt-3 p-2 bg-purple-900/20 rounded text-xs">
                <p className="text-purple-300">
                  <strong>x402:</strong> Internet-native payment protocol enabling AI agents to autonomously request and process micropayments using HTTP 402 status codes.
                </p>
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
