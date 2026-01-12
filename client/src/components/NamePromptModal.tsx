import { useState } from 'react';

interface NamePromptModalProps {
  isOpen: boolean;
  initialName?: string;
  darkMode: boolean;
  onSubmit: (name: string) => void;
}

export const NamePromptModal = ({
  isOpen,
  initialName = '',
  darkMode,
  onSubmit,
}: NamePromptModalProps) => {
  const [nameInput, setNameInput] = useState(initialName);

  const handleSubmit = () => {
    onSubmit(nameInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const colors = darkMode ? {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    border: '#404040',
    primary: '#4a9eff',
  } : {
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333',
    textSecondary: '#666',
    border: '#e0e0e0',
    primary: '#007bff',
  };

  const styles = getStyles(colors, darkMode);

  if (!isOpen) return null;

  return (
    <div style={styles.container}>
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <h2 style={styles.modalTitle}>Join Session</h2>
          <p style={styles.namePromptText}>Enter your name to join this planning poker session</p>
          <input
            type="text"
            placeholder="Your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyPress={handleKeyPress}
            style={styles.input}
            autoFocus
          />
          <div style={styles.modalActions}>
            <button onClick={handleSubmit} style={styles.primaryButton}>
              Join Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const getStyles = (colors: any, darkMode: boolean): { [key: string]: React.CSSProperties } => ({
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: colors.text,
  },
  namePromptText: {
    fontSize: '16px',
    color: colors.textSecondary,
    marginBottom: '20px',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    marginBottom: '16px',
    boxSizing: 'border-box',
    backgroundColor: colors.surface,
    color: colors.text,
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  primaryButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
});
