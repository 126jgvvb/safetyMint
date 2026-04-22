import { useEffect, useState } from 'react';
import { sessionService } from '../services/session';
import './SessionTimer.css';

export default function SessionTimer() {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    const unsubscribeWarning = sessionService.addListener((event, data) => {
      if (event === 'session_warning') {
        setRemainingTime(data.remainingTime / 1000); // Convert to seconds
        setShowWarning(true);
      }
    });

    const unsubscribeEnded = sessionService.addListener((event) => {
      if (event === 'session_ended') {
        setShowWarning(false);
      }
    });

    // Update countdown every second
    const interval = setInterval(() => {
      if (showWarning && !isExtending) {
        const remaining = sessionService.getRemainingTime() / 1000;
        setRemainingTime(Math.max(0, remaining));
        if (remaining <= 0) {
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => {
      unsubscribeWarning();
      unsubscribeEnded();
      clearInterval(interval);
    };
  }, [showWarning, isExtending]);

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      sessionService.extendSession();
      setShowWarning(false);
      setRemainingTime(0);
    } catch (error) {
      console.error('Failed to extend session:', error);
    } finally {
      setIsExtending(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!showWarning) return null;

  return (
    <div className="session-warning-overlay">
      <div className="session-warning-modal">
        <div className="session-warning-icon">⏰</div>
        <h3>Session Expiring Soon</h3>
        <p>
          Your session will expire in <strong>{formatTime(remainingTime)}</strong>
          due to inactivity.
        </p>
        <p className="session-warning-hint">
          Click the button below to continue your session.
        </p>
        <div className="session-warning-actions">
          <button
            onClick={handleExtendSession}
            disabled={isExtending}
            className="extend-session-btn"
          >
            {isExtending ? 'Extending...' : 'Continue Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
