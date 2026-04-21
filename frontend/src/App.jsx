import { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { ARC_TESTNET, ZODIAC_SIGNS, ZODIAC_EMOJIS, CONTRACT_ABI } from './constants';
import './App.css';

import HoroscoppeDashboard from './components/HoroscoppeDashboard';
import AstroAgentForm from './components/AstroAgentForm';
import AstroChat from './components/AstroChat';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS) {
  console.warn('⚠️ VITE_CONTRACT_ADDRESS is not set. Minting will not work.');
}

export default function App() {
  const [view, setView] = useState('home'); // home | horoscope | agent-form | analysis-result | chat
  const [analysisData, setAnalysisData] = useState(null);

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
    } catch {
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
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        setError('Transaction rejected by user.');
      } else {
        setError('Minting failed: ' + err.message);
      }
    } finally {
      setMinting(false);
    }
  }

  const renderAnalysisResult = () => {
    if (!analysisData) return null;
    const { name, sign, analysis } = analysisData;
    return (
      <div className="analysis-container">
        <h2 className="analysis-title">
          ✨ The Cosmos Have Spoken ✨
        </h2>
        <div className="analysis-content">
          
          <div className="analysis-card-gold">
            <h3 className="analysis-card-gold-title">
              {name}'s Cosmic Blueprint ({sign})
            </h3>
            <p className="analysis-text"><strong>Rising Sign Note:</strong> {analysis.risingSignNote}</p>
            <p className="analysis-text"><strong>Moon Sign Estimate:</strong> {analysis.moonSignEstimate}</p>
            <p className="analysis-text"><strong>Life Path Theme:</strong> {analysis.lifePathTheme}</p>
          </div>

          <div className="analysis-card-purple">
            <h3 className="analysis-card-purple-title">Traits & Paths</h3>
            <ul className="analysis-list">
              <li><strong>Personality:</strong> {analysis.personalityTraits?.join(', ')}</li>
              <li><strong>Love Compatibility:</strong> {analysis.loveCompatibility?.join(', ')}</li>
              <li><strong>Career Strengths:</strong> {analysis.careerStrengths?.join(', ')}</li>
            </ul>
          </div>

          <div className="analysis-card-purple">
            <h3 className="analysis-card-purple-title">Forecast & Guidance</h3>
            <p className="analysis-text"><strong>Current Year:</strong> {analysis.currentYearForecast}</p>
            <p className="analysis-text"><strong>Next Month:</strong> {analysis.nextMonthForecast}</p>
            <p className="analysis-text"><strong>Challenges:</strong> {analysis.lifeChallenges?.join(', ')}</p>
          </div>

          <div className="analysis-card-gold">
            <h3 className="analysis-card-gold-title">Spiritual Message</h3>
            <p className="spiritual-message-text">{analysis.spiritualMessage}</p>
            <div className="lucky-stats">
              <span><strong>🔢 Lucky Numbers:</strong> {analysis.luckyNumbers?.join(', ')}</span>
              <span><strong>🎨 Colors:</strong> {analysis.luckyColors?.join(', ')}</span>
            </div>
          </div>
          
          <button 
            className="chat-agent-btn"
            onClick={() => setView('chat')}
            onMouseOver={(e) => Object.assign(e.target.style, { transform: 'scale(1.02)' })}
            onMouseOut={(e) => Object.assign(e.target.style, { transform: 'scale(1)' })}
          >
            Chat with Your Cosmic Guide 💬
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      {/* Top Navbar */}
      <nav className="top-navbar">
        <h2 
          className="nav-logo"
          onClick={() => setView('home')}
        >
          🔮 FortuneAgent
        </h2>
        <div className="nav-actions">
          <button 
            onClick={() => setView('horoscope')} 
            className="nav-btn"
            onMouseOver={e => e.target.style.color = '#ffd700'}
            onMouseOut={e => e.target.style.color = '#fff'}
          >
            Daily Horoscope
          </button>
          <button 
            onClick={() => setView('agent-form')} 
            className="nav-btn"
            onMouseOver={e => e.target.style.color = '#ffd700'}
            onMouseOut={e => e.target.style.color = '#fff'}
          >
            My Cosmic Blueprint
          </button>
          {!wallet ? (
            <button className="btn primary nav-wallet-btn" onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <span className="wallet-badge">
              ✅ {wallet.address.slice(0,6)}...{wallet.address.slice(-4)}
            </span>
          )}
        </div>
      </nav>

      {/* Main Content Areas */}
      <main className="main-content">
        {view === 'home' && (
          <div className="home-container">
            <h1 className="home-title">Welcome to <span className="home-title-highlight">FortuneAgent</span></h1>
            <p className="home-subtitle">Your personal AI astrologer. Explore the cosmos, uncover your destiny, and chart your spiritual path completely on-chain.</p>
            
            <div className="home-actions">
              <button 
                className="btn primary action-btn-large" 
                onClick={() => setView('horoscope')}
              >
                Check Daily Horoscope 🌟
              </button>
              <button 
                className="btn mint action-btn-mint" 
                onClick={() => setView('agent-form')}
              >
                Discover My Blueprint ✨
              </button>
            </div>

            <div className="divider-container">
              <div className="divider-line-left"></div>
              <span className="divider-text">Quick Fortune Mint</span>
              <div className="divider-line-right"></div>
            </div>
            
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
              <div className="mt-2rem">
                <button className="btn primary" onClick={getFortune} disabled={loading}>
                  {loading ? '✨ Reading the stars...' : `Get ${zodiac} Fortune`}
                </button>
              </div>
            )}

            {fortune && (
              <div className="fortune-box mt-2rem">
                <p>{fortune}</p>
                <button className="btn mint" onClick={mintFortune} disabled={minting || !wallet}>
                  {minting ? '⛏️ Minting...' : '🪙 Mint My Fortune as NFT'}
                </button>
              </div>
            )}

            {txHash && (
              <div className="success mt-1_5rem">
                ✅ Fortune Minted!{' '}
                <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer" className="link-gold">
                  View on Arc Scan →
                </a>
              </div>
            )}

            {error && <div className="error mt-1_5rem">⚠️ {error}</div>}

            {/* Smart Contract Interactive Elements */}
            <div className="stats-card">
              <h3 className="stats-title">On-Chain Statistics & Tipping</h3>
              
              <div className="stats-actions">
                <button 
                  className="btn primary"
                  onClick={async () => {
                    if(!wallet) return setError('Connect wallet first.');
                    try {
                      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet.provider);
                      const total = await contract.totalMinted();
                      alert(`Total Fortunes Minted on Arc Testnet: ${total.toString()}`);
                    } catch(err) {
                      setError('Failed to fetch stats: ' + err.message);
                    }
                  }}
                >
                  📊 View Total Mints
                </button>

                <button 
                  className="btn primary btn-tip"
                  onClick={async () => {
                    if(!wallet) return setError('Connect wallet first.');
                    try {
                      const tx = await wallet.signer.sendTransaction({
                        to: "0x1111111111111111111111111111111111111111",
                        value: ethers.parseEther("0.01")
                      });
                      alert(`Transaction sent! Hash: ${tx.hash}`);
                      await tx.wait();
                      alert('Thank you for your 0.01 USDC cosmic tip! ✨');
                    } catch(err) {
                      if (err.code === 'ACTION_REJECTED' || err.code === 4001) return setError('Tip rejected.');
                      setError('Tip failed: ' + err.message);
                    }
                  }}
                >
                  💧 Tip 0.01 USDC Natively
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'horoscope' && <HoroscoppeDashboard />}
        
        {view === 'agent-form' && (
          <AstroAgentForm onAnalysisComplete={(data) => {
            setAnalysisData(data);
            setView('analysis-result');
          }} />
        )}

        {view === 'analysis-result' && renderAnalysisResult()}

        {view === 'chat' && analysisData && (
          <AstroChat 
            userName={analysisData.name} 
            zodiacSign={analysisData.sign} 
            analysis={analysisData.analysis} 
            sessionId={analysisData.sessionId} 
          />
        )}
      </main>
      <footer className="site-footer">
        Powered by Nous Research AI ✨ | Built on Arc Testnet
      </footer>
    </div>
  );
}
