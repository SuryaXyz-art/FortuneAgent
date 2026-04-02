import { useState } from 'react';
import axios from 'axios';
import styles from './HoroscoppeDashboard.module.css';

const ZODIAC_DATA = [
  { sign: 'Aries', emoji: '♈', dates: 'Mar 21 - Apr 19' },
  { sign: 'Taurus', emoji: '♉', dates: 'Apr 20 - May 20' },
  { sign: 'Gemini', emoji: '♊', dates: 'May 21 - Jun 20' },
  { sign: 'Cancer', emoji: '♋', dates: 'Jun 21 - Jul 22' },
  { sign: 'Leo', emoji: '♌', dates: 'Jul 23 - Aug 22' },
  { sign: 'Virgo', emoji: '♍', dates: 'Aug 23 - Sep 22' },
  { sign: 'Libra', emoji: '♎', dates: 'Sep 23 - Oct 22' },
  { sign: 'Scorpio', emoji: '♏', dates: 'Oct 23 - Nov 21' },
  { sign: 'Sagittarius', emoji: '♐', dates: 'Nov 22 - Dec 21' },
  { sign: 'Capricorn', emoji: '♑', dates: 'Dec 22 - Jan 19' },
  { sign: 'Aquarius', emoji: '♒', dates: 'Jan 20 - Feb 18' },
  { sign: 'Pisces', emoji: '♓', dates: 'Feb 19 - Mar 20' }
];

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function HoroscoppeDashboard() {
  const [selectedSign, setSelectedSign] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [horoscopeData, setHoroscopeData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchHoroscope = async (zodiac) => {
    setSelectedSign(zodiac);
    setIsOpen(true);
    setLoading(true);
    setError(null);
    setHoroscopeData(null);

    try {
      // FIXED: Backend returns { sign, date, horoscope: {...} }, extract nested horoscope object
      const res = await axios.get(`${BACKEND_URL}/api/horoscope/${zodiac.sign.toLowerCase()}`);
      setHoroscopeData(res.data.horoscope);
    } catch (err) {
      setError(
        err.response?.data?.error || 
        'Failed to connect to the cosmos. The stars are clouded right now.'
      );
      setToast('Failed to load horoscope. Please try again.');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    // Reset state after transition completes
    setTimeout(() => {
      setSelectedSign(null);
      setHoroscopeData(null);
    }, 300);
  };

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {ZODIAC_DATA.map((zodiac) => (
          <div 
            key={zodiac.sign} 
            className={styles.card}
            onClick={() => fetchHoroscope(zodiac)}
            role="button"
            tabIndex={0}
          >
            <span className={styles.emoji}>{zodiac.emoji}</span>
            <div className={styles.signName}>{zodiac.sign}</div>
            <div className={styles.dates}>{zodiac.dates}</div>
          </div>
        ))}
      </div>

      {isOpen && selectedSign && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.closeButton} 
              onClick={closeModal}
              aria-label="Close modal"
            >
              &times;
            </button>
            
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {selectedSign.emoji} {selectedSign.sign}
              </h2>
              <p className={styles.dates}>{selectedSign.dates}</p>
            </div>

            {loading && (
              <div className={styles.loadingSpinner}>
                <div className={styles.spinner}></div>
                <p>Consulting the cosmos...</p>
              </div>
            )}

            {error && (
              <div className={styles.error}>
                <p>⚠️ {error}</p>
              </div>
            )}

            {horoscopeData && !loading && (
              <div className={styles.horoscopeContent}>
                <div className={styles.section}>
                  <h3>🌟 General</h3>
                  <p>{horoscopeData.general || horoscopeData.General || 'Destiny unfolds...'}</p>
                </div>
                <div className={styles.section}>
                  <h3>❤️ Love</h3>
                  <p>{horoscopeData.love || horoscopeData.Love || 'The stars are mysterious.'}</p>
                </div>
                <div className={styles.section}>
                  <h3>💼 Career</h3>
                  <p>{horoscopeData.career || horoscopeData.Career || 'Patience will bring success.'}</p>
                </div>
                <div className={styles.section}>
                  <h3>🌿 Health</h3>
                  <p>{horoscopeData.health || horoscopeData.Health || 'Balance your energies.'}</p>
                </div>
                <div className={styles.section}>
                  <h3>🔢 Lucky Number</h3>
                  <p>{horoscopeData.luckyNumber || horoscopeData.LuckyNumber || Math.floor(Math.random() * 100)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
