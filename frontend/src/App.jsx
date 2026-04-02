import { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { ARC_TESTNET, ZODIAC_SIGNS, ZODIAC_EMOJIS, CONTRACT_ABI } from './constants';
import './App.css';

import HoroscoppeDashboard from './components/HoroscoppeDashboard';
import AstroAgentForm from './components/AstroAgentForm';
import AstroChat from './components/AstroChat';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

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
      // FIXED: Added specific user-rejection handling
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
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
        <h2 style={{ color: '#ffd700', textAlign: 'center', fontSize: '2.5rem', textShadow: '0 0 15px rgba(255, 215, 0, 0.4)' }}>
          ✨ The Cosmos Have Spoken ✨
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#fff' }}>
          
          <div style={{ background: 'linear-gradient(135deg, rgba(19,6,35,0.8), rgba(17,26,59,0.8))', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255, 215, 0, 0.4)', boxShadow: '0 0 30px rgba(255, 215, 0, 0.1)' }}>
            <h3 style={{ color: '#ffd700', marginTop: 0, borderBottom: '1px solid rgba(255,215,0,0.2)', paddingBottom: '0.5rem' }}>
              {name}'s Cosmic Blueprint ({sign})
            </h3>
            <p style={{ lineHeight: 1.6 }}><strong>Rising Sign Note:</strong> {analysis.risingSignNote}</p>
            <p style={{ lineHeight: 1.6 }}><strong>Moon Sign Estimate:</strong> {analysis.moonSignEstimate}</p>
            <p style={{ lineHeight: 1.6 }}><strong>Life Path Theme:</strong> {analysis.lifePathTheme}</p>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(19,6,35,0.8), rgba(17,26,59,0.8))', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(155, 81, 224, 0.4)' }}>
            <h3 style={{ color: '#9b51e0', marginTop: 0 }}>Traits & Paths</h3>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.6 }}>
              <li><strong>Personality:</strong> {analysis.personalityTraits?.join(', ')}</li>
              <li><strong>Love Compatibility:</strong> {analysis.loveCompatibility?.join(', ')}</li>
              <li><strong>Career Strengths:</strong> {analysis.careerStrengths?.join(', ')}</li>
            </ul>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(19,6,35,0.8), rgba(17,26,59,0.8))', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(155, 81, 224, 0.4)' }}>
            <h3 style={{ color: '#9b51e0', marginTop: 0 }}>Forecast & Guidance</h3>
            <p style={{ lineHeight: 1.6 }}><strong>Current Year:</strong> {analysis.currentYearForecast}</p>
            <p style={{ lineHeight: 1.6 }}><strong>Next Month:</strong> {analysis.nextMonthForecast}</p>
            <p style={{ lineHeight: 1.6 }}><strong>Challenges:</strong> {analysis.lifeChallenges?.join(', ')}</p>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(19,6,35,0.8), rgba(17,26,59,0.8))', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255, 215, 0, 0.4)' }}>
            <h3 style={{ color: '#ffd700', marginTop: 0 }}>Spiritual Message</h3>
            <p style={{ fontStyle: 'italic', lineHeight: 1.8, fontSize: '1.1rem' }}>{analysis.spiritualMessage}</p>
            <div style={{ marginTop: '1.5rem', color: '#a0a0b0', fontSize: '0.95rem', display: 'flex', gap: '2rem' }}>
              <span><strong>🔢 Lucky Numbers:</strong> {analysis.luckyNumbers?.join(', ')}</span>
              <span><strong>🎨 Colors:</strong> {analysis.luckyColors?.join(', ')}</span>
            </div>
          </div>
          
          <button 
            style={{ 
              padding: '1.25rem', fontSize: '1.25rem', marginTop: '1.5rem', 
              background: 'linear-gradient(90deg, #4a2a6b, #9b51e0, #ffd700, #9b51e0, #4a2a6b)',
              backgroundSize: '300% auto', color: '#fff', border: '1px solid #ffd700', 
              borderRadius: '12px', cursor: 'pointer', fontWeight: 800, textTransform: 'uppercase'
            }} 
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
      <nav style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1.2rem 2.5rem', background: 'rgba(0,0,0,0.6)', 
        borderBottom: '1px solid rgba(255, 215, 0, 0.2)', marginBottom: '2rem',
        backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50
      }}>
        <h2 
          style={{ margin: 0, cursor: 'pointer', color: '#ffd700', textShadow: '0 0 10px rgba(255,215,0,0.3)', verticalAlign: 'middle', display: 'flex', alignItems: 'center', gap: '0.5rem' }} 
          onClick={() => setView('home')}
        >
          🔮 FortuneAgent
        </h2>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <button 
            onClick={() => setView('horoscope')} 
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, transition: 'color 0.2s' }}
            onMouseOver={e => e.target.style.color = '#ffd700'}
            onMouseOut={e => e.target.style.color = '#fff'}
          >
            Daily Horoscope
          </button>
          <button 
            onClick={() => setView('agent-form')} 
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, transition: 'color 0.2s' }}
            onMouseOver={e => e.target.style.color = '#ffd700'}
            onMouseOut={e => e.target.style.color = '#fff'}
          >
            My Cosmic Blueprint
          </button>
          {!wallet ? (
            <button className="btn primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }} onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <span style={{ fontSize: '0.9rem', color: '#ffd700', background: 'rgba(255,215,0,0.1)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(255,215,0,0.3)' }}>
              ✅ {wallet.address.slice(0,6)}...{wallet.address.slice(-4)}
            </span>
          )}
        </div>
      </nav>

      {/* Main Content Areas */}
      <main style={{ padding: '0 1rem 3rem' }}>
        {view === 'home' && (
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '3rem auto' }}>
            <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', color: '#fff', letterSpacing: '1px' }}>Welcome to <span style={{ color: '#ffd700' }}>FortuneAgent</span></h1>
            <p style={{ fontSize: '1.2rem', color: '#a0a0b0', marginBottom: '3.5rem', lineHeight: 1.6 }}>Your personal AI astrologer. Explore the cosmos, uncover your destiny, and chart your spiritual path completely on-chain.</p>
            
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '4.5rem', flexWrap: 'wrap' }}>
              <button 
                className="btn primary" 
                style={{ padding: '1.2rem 2.5rem', fontSize: '1.2rem' }} 
                onClick={() => setView('horoscope')}
              >
                Check Daily Horoscope 🌟
              </button>
              <button 
                className="btn mint" 
                style={{ padding: '1.2rem 2.5rem', fontSize: '1.2rem', background: 'transparent', border: '2px solid #9b51e0', color: '#9b51e0' }} 
                onClick={() => setView('agent-form')}
              >
                Discover My Blueprint ✨
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '3rem 0', opacity: 0.6 }}>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #4a2a6b)' }}></div>
              <span style={{ padding: '0 1.5rem', color: '#a0a0b0', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '2px' }}>Quick Fortune Mint</span>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg, transparent, #4a2a6b)' }}></div>
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
              <div style={{ marginTop: '2rem' }}>
                <button className="btn primary" onClick={getFortune} disabled={loading}>
                  {loading ? '✨ Reading the stars...' : `Get ${zodiac} Fortune`}
                </button>
              </div>
            )}

            {fortune && (
              <div className="fortune-box" style={{ marginTop: '2rem' }}>
                <p>{fortune}</p>
                <button className="btn mint" onClick={mintFortune} disabled={minting || !wallet}>
                  {minting ? '⛏️ Minting...' : '🪙 Mint My Fortune as NFT'}
                </button>
              </div>
            )}

            {txHash && (
              <div className="success" style={{ marginTop: '1.5rem' }}>
                ✅ Fortune Minted!{' '}
                <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: '#ffd700', textDecoration: 'underline' }}>
                  View on Arc Scan →
                </a>
              </div>
            )}

            {error && <div className="error" style={{ marginTop: '1.5rem' }}>⚠️ {error}</div>}
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
      <footer style={{ textAlign: 'center', padding: '2rem', color: '#a0a0b0', borderTop: '1px solid rgba(255,215,0,0.1)', marginTop: '2rem' }}>
        Powered by Nous Research AI ✨ | Built on Arc Testnet
      </footer>
    </div>
  );
}
