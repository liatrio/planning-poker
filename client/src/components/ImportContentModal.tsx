import { useState } from 'react';

interface ImportContentModalProps {
  isOpen: boolean;
  darkMode: boolean;
  onImport: (content: string, format: 'markdown' | 'json') => void;
  onCancel: () => void;
}

export const ImportContentModal = ({
  isOpen,
  darkMode,
  onImport,
  onCancel,
}: ImportContentModalProps) => {
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');

  if (!isOpen) return null;

  const colors = darkMode ? {
    background: 'rgba(0, 0, 0, 0.8)',
    surface: '#2d2d2d',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    border: '#404040',
    primary: '#4a9eff',
  } : {
    background: 'rgba(0, 0, 0, 0.5)',
    surface: '#ffffff',
    text: '#333',
    textSecondary: '#666',
    border: '#e0e0e0',
    primary: '#007bff',
  };

  const styles = getStyles(colors);

  const handleImport = () => {
    if (content.trim()) {
      onImport(content, format);
      setContent('');
    }
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Import Content</h2>

        <div style={styles.formatSelector}>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              value="markdown"
              checked={format === 'markdown'}
              onChange={() => setFormat('markdown')}
              style={styles.radio}
            />
            Markdown
          </label>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              value="json"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
              style={styles.radio}
            />
            TipTap JSON
          </label>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={format === 'markdown' ? 'Paste your markdown here...' : 'Paste your TipTap JSON here...'}
          style={styles.textarea}
          rows={15}
        />

        <div style={styles.modalActions}>
          <button onClick={onCancel} style={styles.secondaryButton}>
            Cancel
          </button>
          <button onClick={handleImport} style={styles.primaryButton}>
            Import
          </button>
        </div>
      </div>
    </div>
  );
};

const getStyles = (colors: any): { [key: string]: React.CSSProperties } => ({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: colors.text,
  },
  formatSelector: {
    display: 'flex',
    gap: '20px',
    marginBottom: '16px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: colors.text,
    fontSize: '14px',
    cursor: 'pointer',
  },
  radio: {
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    fontFamily: 'monospace',
    backgroundColor: colors.surface,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    resize: 'vertical',
    marginBottom: '20px',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    flexShrink: 0,
    marginTop: 'auto',
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
  secondaryButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: colors.surface,
    color: colors.primary,
    border: `2px solid ${colors.primary}`,
    borderRadius: '4px',
    cursor: 'pointer',
  },
});
