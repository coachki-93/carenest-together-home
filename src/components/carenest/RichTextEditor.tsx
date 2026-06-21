import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Code,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "rte-content min-h-[260px] max-h-[500px] overflow-y-auto px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external value when dialog reopens with different content
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value || "", { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const handleImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error(t("instructions.imageTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      editor?.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
  };

  const setLink = () => {
    const prev = editor?.getAttributes("link").href as string | undefined;
    const url = window.prompt(t("instructions.linkPrompt"), prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  if (!editor) return null;

  return (
    <div className="rounded-xl border bg-background overflow-hidden">
      <Toolbar
        editor={editor}
        onPickImage={() => fileRef.current?.click()}
        onSetLink={setLink}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImage(f);
          e.target.value = "";
        }}
      />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({
  editor,
  onPickImage,
  onSetLink,
}: {
  editor: Editor;
  onPickImage: () => void;
  onSetLink: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1.5">
      <TBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="H1"><Heading1 className="size-4" /></TBtn>
      <TBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="H2"><Heading2 className="size-4" /></TBtn>
      <TBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="H3"><Heading3 className="size-4" /></TBtn>
      <Sep />
      <TBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold"><Bold className="size-4" /></TBtn>
      <TBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic"><Italic className="size-4" /></TBtn>
      <TBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline"><UnderlineIcon className="size-4" /></TBtn>
      <TBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strike"><Strikethrough className="size-4" /></TBtn>
      <Sep />
      <TBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullets"><List className="size-4" /></TBtn>
      <TBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered"><ListOrdered className="size-4" /></TBtn>
      <TBtn active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} label="Checklist"><ListChecks className="size-4" /></TBtn>
      <Sep />
      <TBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote"><Quote className="size-4" /></TBtn>
      <TBtn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} label="Code"><Code className="size-4" /></TBtn>
      <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Divider"><Minus className="size-4" /></TBtn>
      <Sep />
      <TBtn active={editor.isActive("link")} onClick={onSetLink} label="Link"><LinkIcon className="size-4" /></TBtn>
      <TBtn onClick={onPickImage} label="Image"><ImageIcon className="size-4" /></TBtn>
      <Sep />
      <TBtn onClick={() => editor.chain().focus().undo().run()} label="Undo"><Undo className="size-4" /></TBtn>
      <TBtn onClick={() => editor.chain().focus().redo().run()} label="Redo"><Redo className="size-4" /></TBtn>
    </div>
  );
}

function TBtn({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("size-8", active && "bg-primary-soft text-primary")}
    >
      {children}
    </Button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-border" />;
}
