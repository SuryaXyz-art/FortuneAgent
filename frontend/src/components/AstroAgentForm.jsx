import { useState } from 'react';
import axios from 'axios';
import styles from './AstroAgentForm.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export default function AstroAgentForm({ onAnalysisComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    timeOfBirth: '',
    unknownTime: false,
    birthCity: '',
    birthCountry: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'unknownTime' && checked) {
      setFormData(prev => ({ ...prev, unknownTime: true, timeOfBirth: '' }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const isStep1Valid = formData.name.trim() !== '' && formData.dateOfBirth !== '';
  const isStep2Valid = formData.birthCity.trim() !== '' && formData.birthCountry.trim() !== '';

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payload = {
        name: formData.name.trim(),
        dateOfBirth: formData.dateOfBirth,
        timeOfBirth: formData.unknownTime ? 'Unknown' : formData.timeOfBirth,
        birthCity: formData.birthCity.trim(),
        birthCountry: formData.birthCountry.trim()
      };
      const res = await axios.post(`${BACKEND_URL}/api/astro-agent/analyze`, payload);
      setResult(res.data);
      if (onAnalysisComplete) {
        onAnalysisComplete(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'The stars are not aligned. Please try again.');
      setToast('Analysis failed. Check your connection.');
      setTimeout(() => setToast(null), 3000);
      setStep(3); // stay on step 3 to show error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingScreen}>
          <div className={styles.starrySpinner}></div>
          <p className={styles.loadingText}>Reading the stars...</p>
        </div>
      </div>
    );
  }

  // (Temporary completion screen removed since App.jsx handles it)

  return (
    <div className={styles.container}>
      <div className={styles.progressBarContainer}>
        <div 
          className={styles.progressBar} 
          style={{ width: `${(step / 3) * 100}%` }}
        ></div>
      </div>

      {step === 1 && (
        <div className={styles.stepContainer}>
          <h2 className={styles.title}>1. Personal Info</h2>
          
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="name">Full Name</label>
            <input 
              type="text" 
              id="name"
              name="name"
              className={styles.input} 
              placeholder="e.g., Jane Doe"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="dateOfBirth">Date of Birth</label>
            <input 
              type="date" 
              id="dateOfBirth"
              name="dateOfBirth"
              className={styles.input} 
              value={formData.dateOfBirth}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="timeOfBirth">Time of Birth</label>
            <input 
              type="time" 
              id="timeOfBirth"
              name="timeOfBirth"
              className={styles.input} 
              value={formData.timeOfBirth}
              onChange={handleChange}
              disabled={formData.unknownTime}
            />
            <div className={styles.checkboxGroup}>
              <input 
                type="checkbox" 
                id="unknownTime"
                name="unknownTime"
                className={styles.checkbox}
                checked={formData.unknownTime}
                onChange={handleChange}
              />
              <label htmlFor="unknownTime" className={styles.checkboxLabel}>
                I don't know my exact time of birth
              </label>
            </div>
          </div>

          <div className={styles.buttons} style={{justifyContent: 'flex-end'}}>
            <button 
              className={`${styles.btn} ${styles.btnPrimary}`} 
              onClick={nextStep}
              disabled={!isStep1Valid}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.stepContainer}>
          <h2 className={styles.title}>2. Birth Location</h2>
          
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="birthCity">Where were you born?</label>
            <input 
              type="text" 
              id="birthCity"
              name="birthCity"
              className={styles.input} 
              placeholder="e.g., London, UK"
              value={formData.birthCity}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="birthCountry">Country of Birth</label>
            {/* Using text input as fallback for dropdown depending on preference */}
            <input 
              type="text" 
              id="birthCountry"
              name="birthCountry"
              className={styles.input} 
              placeholder="e.g., United Kingdom"
              value={formData.birthCountry}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.buttons}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={prevStep}>
              ← Back
            </button>
            <button 
              className={`${styles.btn} ${styles.btnPrimary}`} 
              onClick={nextStep}
              disabled={!isStep2Valid}
            >
              Confirm →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className={styles.stepContainer}>
          <h2 className={styles.title}>3. Confirmation</h2>
          
          <div className={styles.summaryCard}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Name</span>
              <span className={styles.summaryValue}>{formData.name}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Date of Birth</span>
              <span className={styles.summaryValue}>{formData.dateOfBirth}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Time of Birth</span>
              <span className={styles.summaryValue}>
                {formData.unknownTime || !formData.timeOfBirth ? 'Unknown' : formData.timeOfBirth}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Location</span>
              <span className={styles.summaryValue}>
                {formData.birthCity}, {formData.birthCountry}
              </span>
            </div>
          </div>

          <div className={styles.buttons} style={{ flexDirection: 'column', gap: '1.5rem', marginTop: 0 }}>
            <button className={styles.btnReveal} onClick={handleSubmit}>
              ✨ Reveal My Cosmic Blueprint
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ margin: '0 auto' }} onClick={prevStep}>
              ← Edit Details
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>
      )}
      
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
