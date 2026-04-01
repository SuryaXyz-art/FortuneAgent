import { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { ARC_TESTNET, ZODIAC_SIGNS, ZODIAC_EMOJIS, CONTRACT_ABI } from './constants';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [zodiac, setZodiac] = useState('');
  const [fortune, setFortune] = useState('');
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  async function connectWallet() {
    setError('');
    try {
      if (!window.ethereum) {
        setError('MetaMask not found. Please install MetaMask.');
        return;
      }
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [ARC_TESTNET]
      });
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWallet({ provider, signer, address });
    } catch (err) {
      setError('Wallet connection failed: ' + err.message);
    }
  }

  async function getFortune() {
    if (!zodiac) { setError('Please select your zodiac sign first.'); return; }
    setError('');
    setFortune('');
    setTxHash('');
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/fortune`, { zodiac });
      setFortune(res.data.fortune);
    } catch (err) {
      setError('Fortune generation failed. Check backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function mintFortune() {
    if (!wallet) { setError('Connect wallet first.'); return; }
    if (!fortune) { setError('Get your fortune first.'); return; }
    if (!CONTRACT_ADDRESS) { setError('CONTRACT_ADDRESS not set in .env'); return; }
    setError('');
    setMinting(true);
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet.signer);
      const tokenURI = `data:application/json;base64,${btoa(JSON.stringify({
        name: `${zodiac} Fortune`,
        description: fortune,
        attributes: [{ trait_type: 'Zodiac', value: zodiac }]
      }))}`;
      const tx = await contract.mintFortune(wallet.address, fortune, tokenURI);
      await tx.wait();
      setTxHash(tx.hash);
    } catch (err) {
      setError('Minting failed: ' + err.message);
    } finally {
      setMinting(false);
    }
  }

  return (
    <div className="app">
      <h1>🔮 Astro Agent</h1>
      <p className="subtitle">Discover your fortune. Mint it on Arc Testnet.</p>

      {!wallet ? (
        <button className="btn primary" onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <p className="wallet-address">✅ {wallet.address.slice(0,6)}...{wallet.address.slice(-4)}</p>
      )}

      <div className="zodiac-grid">
        {ZODIAC_SIGNS.map(sign => (
          <button
            key={sign}
            className={`zodiac-btn ${zodiac === sign ? 'selected' : ''}`}
            onClick={() => { setZodiac(sign); setFortune(''); setTxHash(''); }}
          >
            {ZODIAC_EMOJIS[sign]} {sign}
          </button>
        ))}
      </div>

      {zodiac && (
        <button className="btn primary" onClick={getFortune} disabled={loading}>
          {loading ? '✨ Reading the stars...' : `Get ${zodiac} Fortune`}
        </button>
      )}

      {fortune && (
        <div className="fortune-box">
          <p>{fortune}</p>
          <button className="btn mint" onClick={mintFortune} disabled={minting || !wallet}>
            {minting ? '⛏️ Minting...' : '🪙 Mint My Fortune as NFT'}
          </button>
        </div>
      )}

      {txHash && (
        <div className="success">
          ✅ Fortune Minted!{' '}
          <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer">
            View on Arc Scan →
          </a>
        </div>
      )}

      {error && <div className="error">⚠️ {error}</div>}
    </div>
  );
}
