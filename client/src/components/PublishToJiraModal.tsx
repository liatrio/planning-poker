import { useState } from 'react';

interface PublishToJiraModalProps {
  isOpen: boolean;
  storyName: string;
  suggestedValue: string;
  darkMode: boolean;
  onPublish: (storyPoints: string) => void;
  onClose: () => void;
}

export const PublishToJiraModal = ({
  isOpen,
  storyName,
  suggestedValue,
  darkMode,
  onPublish,
  onClose,
}: PublishToJiraModalProps) => {
  const [storyPoints, setStoryPoints] = useState(suggestedValue);

  if (!isOpen) return null;

  const handlePublish = () => {
    if (storyPoints.trim()) {
      onPublish(storyPoints.trim());
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePublish();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const colors = darkMode ? {
    overlay: 'rgba(0, 0, 0, 0.7)',
    surface: '#2d2d2d',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    border: '#404040',
    primary: '#4a9eff',
    danger: '#dc3545',
  } : {
    overlay: 'rgba(0, 0, 0, 0.5)',
    surface: '#ffffff',
    text: '#333',
    textSecondary: '#666',
    border: '#e0e0e0',
    primary: '#007bff',
    danger: '#dc3545',
  };

  const styles = getStyles(colors);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Publish to JIRA</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>
        <div style={styles.modalContent}>
          <div style={styles.storyInfo}>
            <div style={styles.label}>Story:</div>
            <div style={styles.storyName}>{storyName}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Story Points
              <span style={styles.hint}> (suggested: {suggestedValue})</span>
            </label>
            <input
              type="text"
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
              onKeyPress={handleKeyPress}
              style={styles.input}
              autoFocus
              placeholder="Enter story points"
            />
            <div style={styles.helpText}>
              You can modify the suggested value before publishing to JIRA
            </div>
          </div>
        </div>
        <div style={styles.modalActions}>
          <button onClick={onClose} style={styles.cancelButton}>
            Cancel
          </button>
          <button
            onClick={handlePublish}
            style={styles.publishButton}
            disabled={!storyPoints.trim()}
          >
            Publish to JIRA
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
    backgroundColor: colors.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: '8px',
    padding: '0',
    minWidth: '500px',
    maxWidth: '600px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: `1px solid ${colors.border}`,
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
    color: colors.text,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    color: colors.textSecondary,
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
  },
  modalContent: {
    padding: '24px',
  },
  storyInfo: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '8px',
  },
  storyName: {
    fontSize: '16px',
    color: colors.text,
    padding: '12px',
    backgroundColor: darkMode ? '#1a1a1a' : '#f5f5f5',
    borderRadius: '4px',
    border: `1px solid ${colors.border}`,
  },
  hint: {
    fontSize: '12px',
    fontWeight: '400',
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  formGroup: {
    marginBottom: '16px',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    boxSizing: 'border-box',
    backgroundColor: colors.surface,
    color: colors.text,
  },
  helpText: {
    fontSize: '12px',
    color: colors.textSecondary,
    marginTop: '8px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '16px 24px',
    borderTop: `1px solid ${colors.border}`,
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: colors.surface,
    color: colors.text,
    border: `2px solid ${colors.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
  },
  publishButton: {
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
