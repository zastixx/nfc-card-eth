'use client';
import React, { useState, useEffect } from 'react';
import { Nfc, CreditCard, ShoppingCart, CheckCircle, AlertCircle, Loader, Smartphone, Wallet, ExternalLink } from 'lucide-react';

type PaymentData = {
  userWallet: string;
  merchantAddress: string;
};

type MerchantInfo = {
  name: string;
  address: string;
  orderId: string;
  amount: string;
  currency: string;
};

const NFC_MERCHANT_PAYMENT = () => {
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [currentStep, setCurrentStep] = useState('scan'); // scan, payment, confirm, success
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo>({
    name: 'Web3 Coffee Shop',
    address: '0x742d35Cc6C5C2b456E3742d35Cc6C5C2b456',
    orderId: '',
    amount: '',
    currency: 'MATIC',
  });
  const [walletConnected, setWalletConnected] = useState(false);
  const [userWallet, setUserWallet] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Check NFC support on component mount
  useEffect(() => {
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    } else {
      setNfcSupported(false);
    }

    // Simulate payment data from URL params (in real app, this comes from NFC tap)
    const urlParams = new URLSearchParams(window.location.search);
    const walletFromNFC = urlParams.get('wallet');
    const merchantAddr = urlParams.get('merchant');
    
    if (walletFromNFC) {
      setPaymentData({
        userWallet: walletFromNFC,
        merchantAddress: merchantAddr || merchantInfo.address
      });
      setCurrentStep('payment');
    }
  }, []);

  // Real NFC Reading Function
  const startNFCReading = async () => {
    if (!nfcSupported) {
      alert('NFC is not supported on this device/browser');
      return;
    }

    try {
      setNfcReading(true);
      
      // @ts-ignore: NDEFReader is available in supporting browsers
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      
      console.log("NFC scan started successfully.");
      
      ndef.addEventListener("reading", (event: { message: { records: any[] } }) => {
        const { message } = event;
        console.log("NFC tag read:", message);
        
        // Process NFC data
        for (const record of message.records) {
          if (record.recordType === "url") {
            const decoder = new TextDecoder();
            const url = decoder.decode(record.data);
            console.log("URL from NFC:", url);
            
            // Extract wallet address from NFC URL
            const urlObj = new URL(url);
            const wallet = urlObj.searchParams.get('wallet');
            const merchant = urlObj.searchParams.get('merchant');
            
            if (wallet) {
              setPaymentData({
                userWallet: wallet,
                merchantAddress: merchant || merchantInfo.address
              });
              setCurrentStep('payment');
            }
          } else if (record.recordType === "text") {
            const decoder = new TextDecoder();
            const text = decoder.decode(record.data);
            console.log("Text from NFC:", text);
            
            // Try to parse as JSON for wallet data
            try {
              const data = JSON.parse(text);
              if (data.wallet) {
                setPaymentData({
                  userWallet: data.wallet,
                  merchantAddress: data.merchant || merchantInfo.address
                });
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
        console.log("Cannot read data from the NFC tag. Try another one?");
        setNfcReading(false);
      });

    } catch (error) {
      console.log("Error starting NFC scan:", error);
      setNfcReading(false);
      
      // For demo purposes, simulate NFC tap with mock data
      setTimeout(() => {
        setPaymentData({
          userWallet: '0xD450060963E63cD0C76d3c113CcB9179fc7fd7cE',
          merchantAddress: merchantInfo.address
        });
        setCurrentStep('payment');
        setNfcReading(false);
      }, 2000);
    }
  };

  // Write NFC Tag (for demo/testing)
  const writeNFCTag = async () => {
    if (!nfcSupported) {
      alert('NFC is not supported on this device/browser');
      return;
    }

    try {
      // @ts-ignore: NDEFReader is available in supporting browsers
      const ndef = new (window as any).NDEFReader();
      
      // Create payment URL that will be written to NFC tag
      const paymentUrl = `${window.location.origin}${window.location.pathname}?wallet=0xD450060963E63cD0C76d3c113CcB9179fc7fd7cE&merchant=${merchantInfo.address}`;
      
      await ndef.write({
        records: [
          { recordType: "url", data: paymentUrl },
          { recordType: "text", data: JSON.stringify({
            wallet: "0xD450060963E63cD0C76d3c113CcB9179fc7fd7cE",
            merchant: merchantInfo.address,
            type: "web3-payment-card"
          })}
        ]
      });
      
      alert("NFC tag written successfully! You can now tap it to test payments.");
      
    } catch (error) {
      console.log("Error writing NFC tag:", error);
      alert("Error writing to NFC tag. Make sure you have a writable tag nearby.");
    }
  };

  // Simulate MetaMask connection
  const connectMetaMask = async () => {
    setIsProcessing(true);
    
    // In real implementation, use:
    // const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    setTimeout(() => {
      setWalletConnected(true);
      setUserWallet(paymentData?.userWallet || '0xD450060963E63cD0C76d3c113CcB9179fc7fd7cE');
      setIsProcessing(false);
    }, 1500);
  };

  // Process payment
  const processPayment = async () => {
    if (!merchantInfo.amount) {
      alert('Please enter payment amount');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('confirm');

    try {
      // In real implementation:
      // const transaction = await window.ethereum.request({
      //   method: 'eth_sendTransaction',
      //   params: [{
      //     from: userWallet,
      //     to: merchantInfo.address,
      //     value: ethers.utils.parseEther(merchantInfo.amount).toHexString(),
      //   }],
      // });

      // Simulate transaction
      setTimeout(() => {
        const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
        setTransactionHash(mockTxHash);
        setCurrentStep('success');
        setIsProcessing(false);
      }, 3000);

    } catch (error) {
      console.error('Payment failed:', error);
      setIsProcessing(false);
      alert('Payment failed. Please try again.');
    }
  };

  const resetFlow = () => {
    setCurrentStep('scan');
    setPaymentData(null);
    setWalletConnected(false);
    setTransactionHash('');
    setMerchantInfo(prev => ({ ...prev, orderId: '', amount: '' }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <Nfc className="w-12 h-12 text-blue-400 mr-3" />
            <ShoppingCart className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
            NFC Payment Terminal
          </h1>
          <p className="text-blue-200">Tap to Pay with Web3</p>
          
          {!nfcSupported && (
            <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/50 max-w-md mx-auto">
              <p className="text-yellow-300 text-sm">
                ⚠️ NFC not supported. Using simulation mode for demo.
              </p>
            </div>
          )}
        </header>

        <div className="max-w-2xl mx-auto">
          
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
                    <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-blue-400 rounded-full animate-ping"></div>
                  )}
                </div>
                
                <p className="text-gray-300 mb-6">
                  {nfcReading ? 'Scanning for NFC card...' : 'Ready to scan customer NFC payment card'}
                </p>

                <button
                  onClick={startNFCReading}
                  disabled={nfcReading}
                  className={`px-8 py-4 rounded-lg font-semibold transition-all duration-200 ${
                    nfcReading 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105'
                  } text-white`}
                >
                  {nfcReading ? 'Scanning...' : 'Start NFC Scan'}
                </button>
              </div>

              {/* Demo Tools */}
              <div className="border-t border-gray-600 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Demo Tools</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={writeNFCTag}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                  >
                    📝 Write Demo NFC Tag
                  </button>
                  <button
                    onClick={() => {
                      setPaymentData({
                        userWallet: '0xD450060963E63cD0C76d3c113CcB9179fc7fd7cE',
                        merchantAddress: merchantInfo.address
                      });
                      setCurrentStep('payment');
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                  >
                    🎭 Simulate NFC Tap
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Payment Page */}
          {currentStep === 'payment' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-green-500/30">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Step 2: Payment Details
              </h2>

              {/* Customer Wallet (Pre-filled from NFC) */}
              <div className="bg-black/40 rounded-lg p-4 mb-6">
                <label className="text-green-400 text-sm font-semibold">Customer Wallet (from NFC)</label>
                <div className="flex items-center mt-2">
                  <Wallet className="w-5 h-5 text-green-400 mr-2" />
                  <p className="text-white font-mono text-sm">{paymentData?.userWallet}</p>
                </div>
              </div>

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
                      step="0.001"
                      value={merchantInfo.amount}
                      onChange={(e) => setMerchantInfo(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="flex-1 px-4 py-3 bg-black/40 border border-gray-600 rounded-l-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-r-lg text-white font-semibold">
                      {merchantInfo.currency}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-white text-sm font-semibold">Order ID (Optional)</label>
                  <input
                    type="text"
                    value={merchantInfo.orderId}
                    onChange={(e) => setMerchantInfo(prev => ({ ...prev, orderId: e.target.value }))}
                    placeholder="Enter order ID or description"
                    className="w-full mt-2 px-4 py-3 bg-black/40 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Payment Button */}
              <button
                onClick={connectMetaMask}
                disabled={!merchantInfo.amount || isProcessing}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 ${
                  !merchantInfo.amount 
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400' 
                    : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white transform hover:scale-105'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Connecting Wallet...
                  </div>
                ) : (
                  `💳 Pay ${merchantInfo.amount} ${merchantInfo.currency}`
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

          {/* Step 3: Wallet Confirmation */}
          {(currentStep === 'confirm' || (walletConnected && currentStep === 'payment')) && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/30">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Step 3: Confirm Transaction
              </h2>

              <div className="bg-black/40 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400">From:</span>
                  <span className="text-white font-mono text-sm">{userWallet.slice(0, 10)}...{userWallet.slice(-8)}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400">To:</span>
                  <span className="text-white font-mono text-sm">{merchantInfo.address.slice(0, 10)}...{merchantInfo.address.slice(-8)}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white font-bold">{merchantInfo.amount} {merchantInfo.currency}</span>
                </div>
                {merchantInfo.orderId && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Order ID:</span>
                    <span className="text-white">{merchantInfo.orderId}</span>
                  </div>
                )}
              </div>

              {currentStep === 'payment' ? (
                <button
                  onClick={processPayment}
                  className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  🔐 Confirm Payment in MetaMask
                </button>
              ) : (
                <div className="text-center">
                  <Loader className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-spin" />
                  <p className="text-yellow-400 font-semibold">Processing transaction...</p>
                  <p className="text-gray-400 text-sm">Please confirm in your wallet</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Success */}
          {currentStep === 'success' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-green-500/30">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-white mb-4">Payment Successful! ✅</h2>
                
                <div className="bg-black/40 rounded-lg p-6 mb-6">
                  <p className="text-gray-400 text-sm mb-2">Transaction Hash:</p>
                  <div className="flex items-center justify-center">
                    <p className="text-green-400 font-mono text-sm mr-2">{transactionHash.slice(0, 20)}...{transactionHash.slice(-10)}</p>
                    <ExternalLink className="w-4 h-4 text-green-400" />
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <p className="text-white font-semibold">{merchantInfo.amount} {merchantInfo.currency} sent to {merchantInfo.name}</p>
                    {merchantInfo.orderId && (
                      <p className="text-gray-400 text-sm">Order: {merchantInfo.orderId}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={resetFlow}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  New Payment
                </button>
              </div>
            </div>
          )}

        </div>

        {/* NFC Setup Guide */}
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
            <h3 className="text-xl font-bold text-white mb-4">🏷️ NFC Card Setup Guide</h3>
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* NFC Tools Instructions */}
              <div className="bg-black/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-blue-400 mb-3">Using NFC Tools App</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                    <p className="text-gray-300">Download <strong className="text-white">NFC Tools</strong> app</p>
                  </div>
                  <div className="flex items-start">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                    <p className="text-gray-300">Tap <strong className="text-white">"WRITE"</strong> → <strong className="text-white">"Add a record"</strong> → <strong className="text-white">"URL/URI"</strong></p>
                  </div>
                  <div className="flex items-start">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                    <div className="text-gray-300">
                      <p>Enter this URL:</p>
                      <div className="bg-black/60 rounded p-2 mt-1 text-xs font-mono break-all">
                        https://yourwebsite.com/pay?wallet=0xD450060963E63cD0C76d3c113CcB9179fc7fd7cE&merchant=0x2fF9c787761Ff79a30574b51f1C83d21510Fbc0e
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                    <p className="text-gray-300">Tap <strong className="text-white">"Write"</strong> and hold NFC card to phone</p>
                  </div>
                </div>
              </div>

              {/* Card Requirements */}
              <div className="bg-black/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-green-400 mb-3">Card Requirements</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center">
                    <span className="text-green-400 mr-2">✅</span>
                    <span className="text-gray-300"><strong className="text-white">NTAG213/215/216</strong> cards</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-400 mr-2">✅</span>
                    <span className="text-gray-300"><strong className="text-white">13.56MHz</strong> frequency</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-400 mr-2">✅</span>
                    <span className="text-gray-300"><strong className="text-white">Writable</strong> (not read-only)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-400 mr-2">✅</span>
                    <span className="text-gray-300"><strong className="text-white">Empty</strong> cards preferred</span>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-600">
                    <p className="text-yellow-300 text-xs">
                      💡 <strong>Replace "yourwebsite.com"</strong> with your actual domain where this app is hosted
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-gray-500/20">
            <h3 className="text-xl font-bold text-white mb-4">How It Works</h3>
            <div className="grid md:grid-cols-4 gap-4 text-center">
              <div className="p-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Nfc className="w-6 h-6 text-white" />
                </div>
                <p className="text-blue-200 font-semibold text-sm">1. NFC Tap</p>
                <p className="text-gray-400 text-xs">Customer taps payment card</p>
              </div>
              <div className="p-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <p className="text-green-200 font-semibold text-sm">2. Payment Page</p>
                <p className="text-gray-400 text-xs">Wallet pre-filled, amount entered</p>
              </div>
              <div className="p-4">
                <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <p className="text-yellow-200 font-semibold text-sm">3. Wallet Confirm</p>
                <p className="text-gray-400 text-xs">MetaMask popup confirmation</p>
              </div>
              <div className="p-4">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <p className="text-purple-200 font-semibold text-sm">4. Success</p>
                <p className="text-gray-400 text-xs">Transaction on blockchain</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFC_MERCHANT_PAYMENT;