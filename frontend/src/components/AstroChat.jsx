import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './AstroChat.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const SUGGESTED_QUESTIONS = [
  "What's my love life like? 💕",
  "Best career path for me? 💼",
  "My biggest life challenge? ⚡",
  "What should I focus on this year? 🎯",
  "My spiritual purpose? 🌌"
];

export default function AstroChat({ userName, zodiacSign, analysis, sessionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Generate the initial AI greeting
    const greeting = `Hello ${userName || 'Traveler'}! ✨ As a ${zodiacSign}, your cosmic blueprint reveals incredible potential.\n\nI've analyzed your chart across love, career, and spiritual growth. What would you like to explore first?`;
    setMessages([{ id: Date.now(), text: greeting, sender: 'ai' }]);
  }, [userName, zodiacSign]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend) => {
    const text = typeof textToSend === 'string' ? textToSend : input;
    if (!text.trim()) return;

    // Add user message to UI
    const userMsg = { id: Date.now(), text: text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await axios.post(`${BACKEND_URL}/api/astro-agent/chat`, {
        sessionId,
        userMessage: text,
        userName,
        zodiacSign
      });
      
      const aiMsg = { id: Date.now() + 1, text: res.data.reply, sender: 'ai' };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = { 
        id: Date.now() + 1, 
        text: "The cosmic connection was disrupted. Please try asking again.", 
        sender: 'ai', 
        error: true 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>Chat with your Cosmic Guide ✨</h2>
        <p className={styles.headerSubtitle}>{userName} • {zodiacSign}</p>
      </div>

      <div className={styles.messagesArea}>
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`${styles.message} ${msg.sender === 'ai' ? styles.aiMessage : styles.userMessage} ${msg.error ? styles.errorMessage : ''}`}
          >
            {msg.text}
          </div>
        ))}
        {isTyping && (
          <div className={styles.typingIndicator}>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <div className={styles.suggestions}>
          {SUGGESTED_QUESTIONS.map((q, i) => (
             <button 
               key={i} 
               className={styles.chip}
               onClick={() => handleSend(q)}
               disabled={isTyping}
               aria-label={`Ask: ${q}`}
             >
               {q}
             </button>
          ))}
        </div>
        <form 
          className={styles.inputForm}
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
        >
          <input 
            type="text"
            className={styles.input}
            placeholder="Ask the cosmos..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
          <button 
            type="submit" 
            className={styles.sendBtn}
            disabled={!input.trim() || isTyping}
            aria-label="Send Message"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
