'use client';

import { useState, useEffect } from 'react';
import {
  initContract,
  getWalletAddress,
  getUser,
  registerUser as blockchainRegisterUser,
  generateCurrentOtp as blockchainGenerateOtp,
  authenticate as blockchainAuthenticate,
} from '../utils/blockchainService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Wallet,
  Shield,
  Key,
} from 'lucide-react';

export default function BlockchainTwoFactorAuth() {
  const [currentStep, setCurrentStep] = useState('connect');
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [user, setUser] = useState(null);

  // Registration form
  const [username, setUsername] = useState('');
  const [otpSeed, setOtpSeed] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // OTP and authentication
  const [currentOTP, setCurrentOTP] = useState('');
  const [inputOTP, setInputOTP] = useState('');
  const [isGeneratingOTP, setIsGeneratingOTP] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authResult, setAuthResult] = useState(null);

  // Error and success messages
  const [message, setMessage] = useState(null);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        await initContract();
        const address = await getWalletAddress();
        setWalletAddress(address);

        // Try to fetch user from blockchain
        try {
          const userData = await getUser(address);
          setUser({
            username: userData,
            walletAddress: address,
          });
          setCurrentStep('profile');
        } catch {
          setCurrentStep('register');
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Please connect your wallet.' });
      }
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setMessage(null);
    try {
      await initContract();
      const address = await getWalletAddress();
      setWalletAddress(address);
      setCurrentStep('register');
      setMessage({ type: 'success', text: 'Wallet connected successfully!' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to connect wallet. Please try again.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  function isValidSeedString(seed) {
    // Check UTF-8 byte length ≤ 31
    return ethers.toUtf8Bytes(seed).length <= 31;
  }

  function isValidSeedHex(seed) {
    return /^0x[a-fA-F0-9]{64}$/.test(seed);
  }

  function convertSeedToBytes32(seed) {
    if (isValidSeedHex(seed)) {
      // Already hex bytes32 string, return as is
      return seed;
    } else if (isValidSeedString(seed)) {
      // Convert string to bytes32 hex string with padding
      return ethers.encodeBytes32String(seed);
    } else {
      throw new Error('Invalid OTP seed format or length');
    }
  }

  const registerUser = async () => {
    if (!username.trim() || !otpSeed.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }
    if (username.length < 3) {
      setMessage({
        type: 'error',
        text: 'Username must be at least 3 characters long.',
      });
      return;
    }
    if (!otpSeed.startsWith('0x') || otpSeed.length !== 8) {
      setMessage({
        type: 'error',
        text: 'OTP seed must start with "0x" and be exactly 8 characters long.',
      });
      return;
    }
    setIsRegistering(true);
    setMessage(null);
    try {
      await blockchainRegisterUser(username.trim(), otpSeed.trim());
      setUser({ username: username.trim(), walletAddress });
      setCurrentStep('profile');
      setMessage({ type: 'success', text: 'Registration successful!' });
    } catch (error) {
      // Show only the user-friendly message if user rejected the transaction
      if (error.code === 4001) {
        setMessage({
          type: 'error',
          text: 'MetaMask Tx Signature: User denied transaction signature.',
        });
      } else {
        // For other errors, show the error message or a fallback
        setMessage({
          type: 'error',
          text: error.message || 'Transaction failed.',
        });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const generateCurrentOTP = async () => {
    console.log('11');

    if (!user || !walletAddress) {
      setMessage({
        type: 'error',
        text: 'Wallet not connected or user not loaded.',
      });
      return;
    }
    console.log('12');
    setIsGeneratingOTP(true);
    setMessage(null);
    try {
      console.log('13');
      await getUser(walletAddress);
      console.log('14');
      const otp = await blockchainGenerateOtp();
      console.log('15');
      setCurrentOTP(otp);
      setMessage({ type: 'success', text: 'OTP generated successfully!' });
    } catch (error) {
      console.error('err', error);
      if (error.message.includes('User not registered')) {
        setMessage({
          type: 'error',
          text: 'You must register before generating OTP.',
        });
        setCurrentStep('register');
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to generate OTP: ' + error.message,
        });
      }
    } finally {
      setIsGeneratingOTP(false);
    }
  };

  const authenticateOTP = async () => {
    if (!inputOTP.trim()) {
      setMessage({ type: 'error', text: 'Please enter the OTP.' });
      return;
    }
    if (inputOTP.length !== 6) {
      setMessage({ type: 'error', text: 'OTP must be 6 digits.' });
      return;
    }
    setIsAuthenticating(true);
    setMessage(null);
    try {
      await blockchainAuthenticate(inputOTP);
      setAuthResult('success');
      setMessage({ type: 'success', text: 'Authentication successful!' });
    } catch (error) {
      setAuthResult('error');
      setMessage({
        type: 'error',
        text: 'Authentication failed: ' + error.message,
      });
    } finally {
      setIsAuthenticating(false);
      setInputOTP('');
    }
  };

  const resetFlow = () => {
    setCurrentStep('profile');
    setCurrentOTP('');
    setInputOTP('');
    setAuthResult(null);
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Blockchain 2FA</h1>
          </div>
          <p className="text-gray-600">
            Secure Two-Factor Authentication with Ethereum Wallet
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4">
          <div
            className={`flex items-center space-x-2 ${
              currentStep === 'connect'
                ? 'text-blue-600'
                : currentStep !== 'connect'
                ? 'text-green-600'
                : 'text-gray-400'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'connect'
                  ? 'bg-blue-100 border-2 border-blue-600'
                  : currentStep !== 'connect'
                  ? 'bg-green-100 border-2 border-green-600'
                  : 'bg-gray-100 border-2 border-gray-300'
              }`}
            >
              {currentStep !== 'connect' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
            </div>
            <span className="text-sm font-medium">Connect</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-300"></div>
          <div
            className={`flex items-center space-x-2 ${
              ['register', 'profile', 'auth'].includes(currentStep)
                ? currentStep === 'register'
                  ? 'text-blue-600'
                  : 'text-green-600'
                : 'text-gray-400'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ['register', 'profile', 'auth'].includes(currentStep)
                  ? currentStep === 'register'
                    ? 'bg-blue-100 border-2 border-blue-600'
                    : 'bg-green-100 border-2 border-green-600'
                  : 'bg-gray-100 border-2 border-gray-300'
              }`}
            >
              {['profile', 'auth'].includes(currentStep) ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Key className="h-4 w-4" />
              )}
            </div>
            <span className="text-sm font-medium">Register</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-300"></div>
          <div
            className={`flex items-center space-x-2 ${
              currentStep === 'auth'
                ? 'text-blue-600'
                : currentStep === 'profile'
                ? 'text-green-600'
                : 'text-gray-400'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'auth'
                  ? 'bg-blue-100 border-2 border-blue-600'
                  : currentStep === 'profile'
                  ? 'bg-green-100 border-2 border-green-600'
                  : 'bg-gray-100 border-2 border-gray-300'
              }`}
            >
              <Shield className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Authenticate</span>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <Alert
            className={
              message.type === 'success'
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription
              className={
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }
            >
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Wallet Connection */}
        {currentStep === 'connect' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Wallet className="h-5 w-5" />
                Connect Your Wallet
              </CardTitle>
              <CardDescription>
                Connect your Ethereum wallet to get started with
                blockchain-based 2FA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect MetaMask
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-500 text-center">
                Make sure you have MetaMask installed and unlocked
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 2: User Registration */}
        {currentStep === 'register' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Register Your Account
              </CardTitle>
              <CardDescription>
                Create your 2FA account with a unique username and OTP seed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wallet">Connected Wallet</Label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <code className="text-sm text-gray-700">{walletAddress}</code>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter a unique username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isRegistering}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="otpSeed">OTP Seed</Label>
                <Input
                  id="otpSeed"
                  type="text"
                  placeholder="Enter your OTP seed (min 8 characters)"
                  value={otpSeed}
                  onChange={(e) => setOtpSeed(e.target.value)}
                  disabled={isRegistering}
                />
                <p className="text-xs text-gray-500">
                  This seed will be used to generate your OTP codes. Keep it
                  secure!
                </p>
              </div>

              <Button
                onClick={registerUser}
                disabled={isRegistering}
                className="w-full"
                size="lg"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register Account'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: User Profile & OTP Generation */}
        {currentStep === 'profile' && user && (
          <div className="space-y-6">
            {/* User Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Account Profile
                </CardTitle>
                <CardDescription>
                  Your registered account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <Badge variant="secondary">{user.username}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Wallet Address</Label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <code className="text-xs text-gray-700">
                        {user.walletAddress}
                      </code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* OTP Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Generate OTP
                </CardTitle>
                <CardDescription>
                  Generate your current One-Time Password for authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!currentOTP ? (
                  <Button
                    onClick={generateCurrentOTP}
                    disabled={isGeneratingOTP}
                    className="w-full"
                    size="lg"
                  >
                    {isGeneratingOTP ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating OTP...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Generate Current OTP
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <Label className="text-sm text-gray-600">
                        Current OTP
                      </Label>
                      <div className="text-4xl font-mono font-bold text-blue-600 tracking-wider">
                        {currentOTP}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        This code refreshes every 30 seconds
                      </p>
                    </div>
                    <Button
                      onClick={() => setCurrentStep('auth')}
                      className="w-full"
                      size="lg"
                    >
                      Proceed to Authentication
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Authentication */}
        {currentStep === 'auth' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Authenticate with OTP
              </CardTitle>
              <CardDescription>
                Enter your 6-digit OTP to complete authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentOTP && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current OTP:</span>
                    <code className="text-lg font-mono font-bold text-blue-600">
                      {currentOTP}
                    </code>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="inputOTP">Enter OTP</Label>
                <Input
                  id="inputOTP"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={inputOTP}
                  onChange={(e) =>
                    setInputOTP(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  disabled={isAuthenticating}
                  className="text-center text-lg font-mono tracking-wider"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={authenticateOTP}
                disabled={isAuthenticating || inputOTP.length !== 6}
                className="w-full"
                size="lg"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Authenticate
                  </>
                )}
              </Button>

              {authResult && (
                <div className="space-y-4">
                  <Separator />
                  <div className="text-center">
                    {authResult === 'success' ? (
                      <div className="space-y-2">
                        <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                        <h3 className="text-lg font-semibold text-green-800">
                          Authentication Successful!
                        </h3>
                        <p className="text-sm text-green-600">
                          You have been successfully authenticated.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
                        <h3 className="text-lg font-semibold text-red-800">
                          Authentication Failed
                        </h3>
                        <p className="text-sm text-red-600">
                          The OTP you entered is incorrect.
                        </p>
                      </div>
                    )}
                    <Button
                      onClick={resetFlow}
                      variant="outline"
                      className="mt-4"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
