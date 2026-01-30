import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import { MarkdownSerializer } from 'prosemirror-markdown';
import { ImportContentModal } from './ImportContentModal';

interface RichTextEditorProps {
  content: string;
  onChange: (json: string) => void;
  placeholder?: string;
  darkMode?: boolean;
}

export const RichTextEditor = ({ content, onChange, darkMode }: RichTextEditorProps) => {
  const [showImportModal, setShowImportModal] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: parseContent(content),
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
  });

  useEffect(() => {
    if (editor && content) {
      try {
        const currentJSON = JSON.stringify(editor.getJSON());
        const newContent = parseContent(content);
        const newJSON = typeof newContent === 'string' ? content : JSON.stringify(newContent);

        if (currentJSON !== newJSON) {
          editor.commands.setContent(newContent);
        }
      } catch (e) {
        // If parsing fails, just skip the update
      }
    }
  }, [content, editor]);

  const colors = darkMode ? {
    background: '#2d2d2d',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    border: '#404040',
    menuBg: '#1e1e1e',
    buttonBg: 'transparent',
    buttonHover: '#3d3d3d',
    buttonActive: '#4a9eff',
  } : {
    background: '#ffffff',
    text: '#333',
    textSecondary: '#666',
    border: '#e0e0e0',
    menuBg: '#f8f9fa',
    buttonBg: 'transparent',
    buttonHover: '#e9ecef',
    buttonActive: '#007bff',
  };

  const handleImport = (content: string, format: 'markdown' | 'json') => {
    if (!editor) return;

    try {
      if (format === 'json') {
        const json = JSON.parse(content);
        editor.commands.setContent(json);
      } else {
        // For markdown, set as plain text and let TipTap handle basic formatting
        editor.commands.setContent(content);
      }
      setShowImportModal(false);
    } catch (error) {
      console.error('Failed to import content:', error);
      alert('Failed to import content. Please check the format and try again.');
    }
  };

  if (!editor) {
    return null;
  }

  const MenuButton = ({
    onClick,
    isActive,
    children,
    title
  }: {
    onClick: () => void;
    isActive: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      type="button"
      title={title}
      style={{
        padding: '6px 8px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        backgroundColor: isActive ? colors.buttonActive : colors.buttonBg,
        color: isActive ? '#fff' : colors.text,
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '32px',
        height: '32px',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = colors.buttonHover;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = colors.buttonBg;
        }
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.menuBar,
        backgroundColor: colors.menuBg,
        borderColor: colors.border,
      }}>
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <strong style={{ fontSize: '15px' }}>B</strong>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <em style={{ fontSize: '15px', fontStyle: 'italic' }}>I</em>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline code"
        >
          <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>&lt;/&gt;</span>
        </MenuButton>

        <div style={styles.divider} />

        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <span style={{ fontWeight: 'bold' }}>H1</span>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <span style={{ fontWeight: 'bold' }}>H2</span>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <span style={{ fontWeight: 'bold' }}>H3</span>
        </MenuButton>

        <div style={styles.divider} />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <span style={{ fontSize: '16px' }}>•</span>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered list"
        >
          <span style={{ fontSize: '14px' }}>1.</span>
        </MenuButton>

        <div style={styles.divider} />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <span style={{ fontSize: '16px' }}>"</span>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code block"
        >
          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{'{ }'}</span>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          isActive={false}
          title="Horizontal rule"
        >
          <span style={{ fontSize: '14px' }}>―</span>
        </MenuButton>

        <div style={styles.divider} />

        <MenuButton
          onClick={() => setShowImportModal(true)}
          isActive={false}
          title="Import Markdown or JSON"
        >
          <span style={{ fontSize: '14px' }}>↓</span>
        </MenuButton>
      </div>
      <div style={{ position: 'relative' }}>
        <EditorContent editor={editor} />
        <style>
          {`
            .tiptap-editor {
              min-height: 120px;
              max-height: 400px;
              overflow-y: auto;
              padding: 12px 16px;
              font-size: 15px;
              line-height: 1.6;
              border: 1px solid ${colors.border};
              border-top: none;
              border-radius: 0 0 4px 4px;
              background-color: ${colors.background};
              color: ${colors.text};
              outline: none;
            }
            .tiptap-editor:focus {
              outline: none;
              border-color: ${colors.buttonActive};
            }
            .tiptap-editor p {
              margin: 0 0 12px 0;
            }
            .tiptap-editor p:last-child {
              margin-bottom: 0;
            }
            .tiptap-editor h1 {
              font-size: 28px;
              font-weight: 700;
              margin: 16px 0 12px 0;
              line-height: 1.3;
            }
            .tiptap-editor h1:first-child {
              margin-top: 0;
            }
            .tiptap-editor h2 {
              font-size: 22px;
              font-weight: 700;
              margin: 14px 0 10px 0;
              line-height: 1.3;
            }
            .tiptap-editor h2:first-child {
              margin-top: 0;
            }
            .tiptap-editor h3 {
              font-size: 18px;
              font-weight: 600;
              margin: 12px 0 8px 0;
              line-height: 1.4;
            }
            .tiptap-editor h3:first-child {
              margin-top: 0;
            }
            .tiptap-editor ul,
            .tiptap-editor ol {
              padding-left: 28px;
              margin: 0 0 12px 0;
            }
            .tiptap-editor ul:last-child,
            .tiptap-editor ol:last-child {
              margin-bottom: 0;
            }
            .tiptap-editor li {
              margin: 4px 0;
            }
            .tiptap-editor strong {
              font-weight: 600;
            }
            .tiptap-editor em {
              font-style: italic;
            }
            .tiptap-editor s {
              text-decoration: line-through;
            }
            .tiptap-editor code {
              background-color: ${darkMode ? '#3d3d3d' : '#f3f4f6'};
              color: ${darkMode ? '#e879f9' : '#e11d48'};
              padding: 2px 6px;
              border-radius: 3px;
              font-family: 'Courier New', monospace;
              font-size: 0.9em;
            }
            .tiptap-editor pre {
              background-color: ${darkMode ? '#1e1e1e' : '#1e1e1e'};
              color: ${darkMode ? '#e0e0e0' : '#e0e0e0'};
              padding: 12px 16px;
              border-radius: 6px;
              overflow-x: auto;
              margin: 12px 0;
              font-family: 'Courier New', monospace;
              font-size: 14px;
              line-height: 1.5;
            }
            .tiptap-editor pre code {
              background: none;
              color: inherit;
              padding: 0;
              font-size: inherit;
            }
            .tiptap-editor blockquote {
              border-left: 3px solid ${colors.border};
              padding-left: 16px;
              margin: 12px 0;
              color: ${colors.textSecondary};
              font-style: italic;
            }
            .tiptap-editor hr {
              border: none;
              border-top: 2px solid ${colors.border};
              margin: 20px 0;
            }
          `}
        </style>
      </div>

      <ImportContentModal
        isOpen={showImportModal}
        darkMode={darkMode || false}
        onImport={handleImport}
        onCancel={() => setShowImportModal(false)}
      />
    </div>
  );
};

// Helper function to parse content (JSON or legacy HTML)
function parseContent(content: string): any {
  if (!content || content.trim() === '') {
    return '';
  }

  try {
    // Try to parse as JSON first
    return JSON.parse(content);
  } catch {
    // If not JSON, treat as HTML (legacy format)
    return content;
  }
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginBottom: '16px',
  },
  menuBar: {
    display: 'flex',
    gap: '4px',
    padding: '8px',
    border: '1px solid',
    borderRadius: '4px 4px 0 0',
    borderBottom: 'none',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  divider: {
    width: '1px',
    height: '24px',
    backgroundColor: '#d1d5db',
    margin: '0 6px',
  },
};
