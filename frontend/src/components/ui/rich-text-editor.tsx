import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import { Card } from './card';
import { Separator } from './separator';
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
} from 'lucide-react';

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 rounded hover:bg-muted transition-colors',
        isActive ? 'bg-muted text-primary' : 'text-muted-foreground',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}

interface RichTextEditorProps {
  content?: string;
  placeholder?: string;
  onUpdate?: (html: string) => void;
  onChange?: (html: string) => void; // Alias para compatibilidade
  editable?: boolean;
  className?: string;
}

export function RichTextEditor({
  content = '',
  placeholder = 'Escreva aqui...',
  onUpdate,
  onChange,
  editable = true,
  className
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onUpdate?.(html);
      onChange?.(html); // Para compatibilidade com componentes que usam onChange
    },
  });

  if (!editor) {
    return <div>Carregando editor...</div>;
  }

  return (
    <Card className={cn('border', className)}>
      {editable && (
        <div className="border-b p-2">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Headings */}
            <div className="flex items-center gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Título 1"
              >
                <Heading1 className="h-4 w-4" />
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Título 2"
              >
                <Heading2 className="h-4 w-4" />
              </ToolbarButton>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Text Formatting */}
            <div className="flex items-center gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Negrito"
              >
                <Bold className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Itálico"
              >
                <Italic className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive('code')}
                title="Código"
              >
                <Code className="h-4 w-4" />
              </ToolbarButton>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Lists */}
            <div className="flex items-center gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Lista com marcadores"
              >
                <List className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Lista numerada"
              >
                <ListOrdered className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Citação"
              >
                <Quote className="h-4 w-4" />
              </ToolbarButton>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Undo/Redo */}
            <div className="flex items-center gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                title="Desfazer"
              >
                <Undo className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                title="Refazer"
              >
                <Redo className="h-4 w-4" />
              </ToolbarButton>
            </div>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="p-4">
        <EditorContent 
          editor={editor} 
          className={cn(
            'prose prose-sm max-w-none',
            'focus-within:outline-none',
            '[&_.ProseMirror]:outline-none',
            '[&_.ProseMirror]:min-h-[120px]',
            '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
            '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
            '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
            '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
            '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0'
          )}
        />
      </div>
    </Card>
  );
}