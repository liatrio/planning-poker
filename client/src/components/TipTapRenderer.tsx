import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface TipTapRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
  darkMode?: boolean;
}

export const TipTapRenderer = ({ content, className, style, darkMode }: TipTapRendererProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: parseContent(content),
    editable: false,
    editorProps: {
      attributes: {
        class: `tiptap-renderer ${className || ''}`,
      },
    },
  });

  useEffect(() => {
    if (editor && content) {
      try {
        const parsed = parseContent(content);
        editor.commands.setContent(parsed);
      } catch (e) {
        // If parsing fails, just skip the update
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const colors = darkMode ? {
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    border: '#404040',
  } : {
    text: '#333',
    textSecondary: '#666',
    border: '#e0e0e0',
  };

  return (
    <>
      <EditorContent editor={editor} style={style} />
      <style>
        {`
          .tiptap-renderer {
            pointer-events: none;
            font-size: 14px;
            line-height: 1.6;
            color: ${colors.textSecondary};
          }
          .tiptap-renderer p {
            margin: 0 0 12px 0;
          }
          .tiptap-renderer p:last-child {
            margin-bottom: 0;
          }
          .tiptap-renderer h1 {
            font-size: 28px;
            font-weight: 700;
            margin: 16px 0 12px 0;
            line-height: 1.3;
            color: ${colors.text};
          }
          .tiptap-renderer h1:first-child {
            margin-top: 0;
          }
          .tiptap-renderer h2 {
            font-size: 22px;
            font-weight: 700;
            margin: 14px 0 10px 0;
            line-height: 1.3;
            color: ${colors.text};
          }
          .tiptap-renderer h2:first-child {
            margin-top: 0;
          }
          .tiptap-renderer h3 {
            font-size: 18px;
            font-weight: 600;
            margin: 12px 0 8px 0;
            line-height: 1.4;
            color: ${colors.text};
          }
          .tiptap-renderer h3:first-child {
            margin-top: 0;
          }
          .tiptap-renderer ul,
          .tiptap-renderer ol {
            padding-left: 28px;
            margin: 0 0 12px 0;
          }
          .tiptap-renderer ul:last-child,
          .tiptap-renderer ol:last-child {
            margin-bottom: 0;
          }
          .tiptap-renderer li {
            margin: 4px 0;
          }
          .tiptap-renderer strong {
            font-weight: 600;
          }
          .tiptap-renderer em {
            font-style: italic;
          }
          .tiptap-renderer s {
            text-decoration: line-through;
          }
          .tiptap-renderer code {
            background-color: ${darkMode ? '#3d3d3d' : '#f3f4f6'};
            color: ${darkMode ? '#e879f9' : '#e11d48'};
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
          .tiptap-renderer pre {
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
          .tiptap-renderer pre code {
            background: none;
            color: inherit;
            padding: 0;
            font-size: inherit;
          }
          .tiptap-renderer blockquote {
            border-left: 3px solid ${colors.border};
            padding-left: 16px;
            margin: 12px 0;
            color: ${colors.textSecondary};
            font-style: italic;
          }
          .tiptap-renderer hr {
            border: none;
            border-top: 2px solid ${colors.border};
            margin: 20px 0;
          }
        `}
      </style>
    </>
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
