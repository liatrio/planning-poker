import { useState, useEffect } from 'react';
import { RichTextEditor } from './RichTextEditor';

interface StoryModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialName?: string;
  initialDescription?: string;
  initialUrl?: string;
  darkMode: boolean;
  onSubmit: (name: string, description: string, url: string) => void;
  onCancel: () => void;
}

export const StoryModal = ({
  isOpen,
  mode,
  initialName = '',
  initialDescription = '',
  initialUrl = '',
  darkMode,
  onSubmit,
  onCancel,
}: StoryModalProps) => {
  const [storyName, setStoryName] = useState(initialName);
  const [storyDescription, setStoryDescription] = useState(initialDescription);
  const [storyUrl, setStoryUrl] = useState(initialUrl);

  useEffect(() => {
    if (isOpen) {
      setStoryName(initialName);
      setStoryDescription(initialDescription);
      setStoryUrl(initialUrl);
    }
  }, [isOpen, initialName, initialDescription, initialUrl]);

  const handleSubmit = () => {
    onSubmit(storyName, storyDescription, storyUrl);
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
    <div style={styles.modal} onClick={onCancel}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>
          {mode === 'create' ? 'Create New Story' : 'Edit Story'}
        </h2>
        <input
          type="text"
          placeholder="Story name"
          value={storyName}
          onChange={(e) => setStoryName(e.target.value)}
          style={styles.input}
          autoFocus
        />
        <RichTextEditor
          content={storyDescription}
          onChange={setStoryDescription}
          placeholder="Description (optional)"
          darkMode={darkMode}
        />
        <input
          type="url"
          placeholder="URL (optional)"
          value={storyUrl}
          onChange={(e) => setStoryUrl(e.target.value)}
          style={styles.input}
        />
        <div style={styles.modalActions}>
          <button onClick={onCancel} style={styles.secondaryButton}>
            Cancel
          </button>
          <button onClick={handleSubmit} style={styles.primaryButton}>
            {mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const getStyles = (colors: any, darkMode: boolean): { [key: string]: React.CSSProperties } => ({
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
