import { useEffect } from 'react';

interface NotificationProps {
  message: string;
  onClose: () => void;
}

export const Notification = ({ message, onClose }: NotificationProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={styles.overlay}>
      <div style={styles.notification}>
        <p style={styles.message}>{message}</p>
        <button onClick={onClose} style={styles.closeButton}>
          ×
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  notification: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    animation: 'slideIn 0.3s ease-out',
  },
  message: {
    margin: 0,
    fontSize: '16px',
    color: '#333',
    paddingRight: '30px',
  },
  closeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
