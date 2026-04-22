"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Bold,
  Heading2,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RichTextEditorHandle = {
  insertHtml: (html: string) => void;
  focus: () => void;
};

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
  onUploadImage?: (file: File) => Promise<{ imageUrl: string }>;
};

function execCommand(command: string, value?: string) {
  if (typeof document === "undefined") return;
  document.execCommand(command, false, value);
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor(
  { value, onChange, placeholder, minHeightClassName = "min-h-[320px]", onUploadImage },
  ref,
) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  useImperativeHandle(ref, () => ({
    insertHtml: (html: string) => {
      editorRef.current?.focus();
      execCommand("insertHTML", html);
      onChange(editorRef.current?.innerHTML ?? "");
    },
    focus: () => {
      editorRef.current?.focus();
    },
  }));

  const buttonClassName = useMemo(
    () =>
      "h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)]",
    [],
  );

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    execCommand(command, commandValue);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const handleLinkInsert = () => {
    const url = window.prompt("Enter the link URL");
    if (!url?.trim()) return;
    runCommand("createLink", url.trim());
  };

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onUploadImage) return;
    try {
      setIsUploading(true);
      const uploaded = await onUploadImage(file);
      editorRef.current?.focus();
      execCommand("insertImage", uploaded.imageUrl);
      onChange(editorRef.current?.innerHTML ?? "");
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] p-3">
        <Button type="button" variant="ghost" className={buttonClassName} onClick={() => runCommand("formatBlock", "<p>")}>
          <Pilcrow className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" className={buttonClassName} onClick={() => runCommand("formatBlock", "<h2>")}>
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" className={buttonClassName} onClick={() => runCommand("bold")}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" className={buttonClassName} onClick={() => runCommand("italic")}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" className={buttonClassName} onClick={() => runCommand("underline")}>
          <Underline className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" className={buttonClassName} onClick={() => runCommand("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" className={buttonClassName} onClick={() => runCommand("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" className={buttonClassName} onClick={handleLinkInsert}>
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={buttonClassName}
          disabled={!onUploadImage || isUploading}
          onClick={() => imageInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input
          ref={imageInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleImageSelection}
        />
        {isUploading ? <span className="ml-auto text-xs font-medium text-[var(--muted)]">Uploading image...</span> : null}
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || "Start writing..."}
        onInput={() => onChange(editorRef.current?.innerHTML ?? "")}
        className={cn(
          "rich-editor px-4 py-4 text-sm leading-7 text-[var(--text)] outline-none",
          minHeightClassName,
        )}
      />
    </div>
  );
});
