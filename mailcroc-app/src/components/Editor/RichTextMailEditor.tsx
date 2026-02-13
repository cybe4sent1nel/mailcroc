"use client";

import React, { useEffect, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { StarterKit } from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Typography } from '@tiptap/extension-typography';
import { Markdown } from 'tiptap-markdown';
import { BubbleMenu as BubbleMenuExtension } from '@tiptap/extension-bubble-menu';
import { FloatingMenu as FloatingMenuExtension } from '@tiptap/extension-floating-menu';
import {
    Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon,
    AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
    CheckSquare, Code, Highlighter, Undo, Redo, Type,
    Heading1, Heading2, Quote, Trash2, Baseline, Mic, Check, X
} from 'lucide-react';
import styles from './RichTextMailEditor.module.css';

interface RichTextMailEditorProps {
    content: string;
    onChange: (html: string) => void;
    onAiPolish?: (text: string) => Promise<string>;
}

const MenuBar = ({ editor, onMicClick, isListening }: { editor: any, onMicClick?: () => void, isListening?: boolean }) => {
    if (!editor) return null;

    const [showLinkInput, setShowLinkInput] = React.useState(false);
    const [linkUrl, setLinkUrl] = React.useState('');

    const setLink = useCallback(() => {
        const previousUrl = editor.getAttributes('link').href;
        setLinkUrl(previousUrl || '');
        setShowLinkInput(true);
    }, [editor]);

    const applyLink = useCallback(() => {
        if (linkUrl === null) return;
        if (linkUrl === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
        }
        setShowLinkInput(false);
    }, [editor, linkUrl]);

    const cancelLink = useCallback(() => {
        setShowLinkInput(false);
        setLinkUrl('');
    }, []);

    const iconProps = {
        size: 16,
        strokeWidth: 2.5,
    };

    return (
        <div className={styles.tiptapToolbar}>
            <div className={styles.toolbarGroup}>
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('bold') ? styles.toolbarBtnActive : ''}`}
                    title="Bold"
                >
                    <Bold {...iconProps} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('italic') ? styles.toolbarBtnActive : ''}`}
                    title="Italic"
                >
                    <Italic {...iconProps} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('underline') ? styles.toolbarBtnActive : ''}`}
                    title="Underline"
                >
                    <UnderlineIcon {...iconProps} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('strike') ? styles.toolbarBtnActive : ''}`}
                    title="Strikethrough"
                >
                    <Type {...iconProps} style={{ textDecoration: 'line-through' }} />
                </button>
            </div>

            <div className={styles.toolbarSeparator} />

            <div className={styles.toolbarGroup}>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('heading', { level: 1 }) ? styles.toolbarBtnActive : ''}`}
                    title="Heading 1"
                >
                    <Heading1 {...iconProps} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('heading', { level: 2 }) ? styles.toolbarBtnActive : ''}`}
                    title="Heading 2"
                >
                    <Heading2 {...iconProps} />
                </button>
            </div>

            <div className={styles.toolbarSeparator} />

            <div className={styles.toolbarGroup}>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`${styles.toolbarBtn} ${editor.isActive({ textAlign: 'left' }) ? styles.toolbarBtnActive : ''}`}
                    title="Align Left"
                >
                    <AlignLeft {...iconProps} />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`${styles.toolbarBtn} ${editor.isActive({ textAlign: 'center' }) ? styles.toolbarBtnActive : ''}`}
                    title="Align Center"
                >
                    <AlignCenter {...iconProps} />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`${styles.toolbarBtn} ${editor.isActive({ textAlign: 'right' }) ? styles.toolbarBtnActive : ''}`}
                    title="Align Right"
                >
                    <AlignRight {...iconProps} />
                </button>
            </div>

            <div className={styles.toolbarSeparator} />

            <div className={styles.toolbarGroup}>
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('bulletList') ? styles.toolbarBtnActive : ''}`}
                    title="Bullet List"
                >
                    <List {...iconProps} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('orderedList') ? styles.toolbarBtnActive : ''}`}
                    title="Ordered List"
                >
                    <ListOrdered {...iconProps} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('taskList') ? styles.toolbarBtnActive : ''}`}
                    title="Task List"
                >
                    <CheckSquare {...iconProps} />
                </button>
            </div>

            <div className={styles.toolbarSeparator} />

            <div className={styles.toolbarGroup}>
                <button
                    onClick={setLink}
                    className={`${styles.toolbarBtn} ${editor.isActive('link') ? styles.toolbarBtnActive : ''}`}
                    title="Link"
                >
                    <LinkIcon {...iconProps} />
                </button>
                <div className={styles.colorPickerWrapper} title="Text Color">
                    <Baseline {...iconProps} color={editor.getAttributes('textStyle').color || '#4a5568'} />
                    <div style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: editor.getAttributes('textStyle').color || '#000000',
                        border: '1px solid #e2e8f0'
                    }} />
                    <input
                        type="color"
                        className={styles.colorInput}
                        onInput={(e) => editor.chain().focus().setColor(e.currentTarget.value).run()}
                        value={editor.getAttributes('textStyle').color || '#000000'}
                    />
                </div>
                <div className={styles.colorPickerWrapper} title="Highlight Color">
                    <Highlighter {...iconProps} color={editor.getAttributes('highlight').color ? '#4a5568' : '#4a5568'} />
                    <div style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: editor.getAttributes('highlight').color || 'transparent',
                        border: '1px solid #e2e8f0'
                    }} />
                    <input
                        type="color"
                        className={styles.colorInput}
                        onInput={(e) => editor.chain().focus().toggleHighlight({ color: e.currentTarget.value }).run()}
                        value={editor.getAttributes('highlight').color || '#ffff00'}
                    />
                </div>
                <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('blockquote') ? styles.toolbarBtnActive : ''}`}
                    title="Quote"
                >
                    <Quote {...iconProps} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('codeBlock') ? styles.toolbarBtnActive : ''}`}
                    title="Code Block"
                >
                    <Code {...iconProps} />
                </button>
            </div>

            <div className={styles.toolbarSeparator} />

            <div className={styles.toolbarGroup}>
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().chain().focus().undo().run()}
                    className={styles.toolbarBtn}
                    title="Undo"
                >
                    <Undo {...iconProps} />
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().chain().focus().redo().run()}
                    className={styles.toolbarBtn}
                    title="Redo"
                >
                    <Redo {...iconProps} />
                </button>
                <button
                    onClick={() => editor.chain().focus().clearContent().run()}
                    className={styles.toolbarBtn}
                    title="Clear All"
                    style={{ color: '#e53e3e' }}
                >
                    <Trash2 {...iconProps} />
                </button>
            </div>

            {onMicClick && (
                <>
                    <div className={styles.toolbarSeparator} />
                    <div className={styles.toolbarGroup}>
                        <button
                            onClick={onMicClick}
                            className={`${styles.toolbarBtn} ${isListening ? styles.pulsing : ''}`}
                            title={isListening ? "Listening..." : "Dictate with AI"}
                            style={{ color: isListening ? '#ef4444' : '#64748b' }}
                        >
                            <Mic {...iconProps} />
                        </button>
                    </div>
                </>
            )}

            {showLinkInput && (
                <div className={styles.linkPopover}>
                    <input
                        type="text"
                        className={styles.linkInput}
                        placeholder="Paste link..."
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') applyLink();
                            if (e.key === 'Escape') cancelLink();
                        }}
                        autoFocus
                    />
                    <button className={`${styles.linkActionBtn} ${styles.primary}`} onClick={applyLink} title="Apply">
                        <Check size={14} />
                    </button>
                    <button className={styles.linkActionBtn} onClick={cancelLink} title="Cancel">
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

const RichTextMailEditor: React.FC<RichTextMailEditorProps> = ({ content, onChange, onAiPolish }) => {
    const [isListening, setIsListening] = React.useState(false);
    const recognitionRef = React.useRef<any>(null);
    const silenceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const transcriptRef = React.useRef("");
    const editorRef = React.useRef<any>(null); // To access editor in callbacks if needed, though closure usually works.

    // Effect to cleanup recognition on unmount
    React.useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, []);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    rel: 'noopener noreferrer',
                    target: '_blank',
                    class: styles.editorLink,
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Typography,
            Markdown.configure({
                html: true,
                tightLists: true,
                bulletListMarker: '-',
            }),
            Placeholder.configure({
                placeholder: 'Write your message...',
            }),
            BubbleMenuExtension,
            FloatingMenuExtension,
        ],
        content: content,
        onUpdate: ({ editor }) => {
            // We get markdown out if we want, or HTML. TipTap logic usually prefers HTML for rich mail.
            // But if we use Markdown extension, getHTML() should handle it.
            onChange(editor.getHTML());
        },
    });

    const startDictation = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice input not supported");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        setIsListening(true);
        transcriptRef.current = "";

        const startPos = editor?.state.selection.from || 0;
        let lastInsertLength = 0;

        recognition.onresult = async (event: any) => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            // Silence timer: Stop after 4 seconds of silence
            silenceTimerRef.current = setTimeout(() => {
                recognition.stop();
            }, 4000);

            let currentSessionTranscript = "";
            for (let i = 0; i < event.results.length; ++i) {
                currentSessionTranscript += event.results[i][0].transcript;
            }
            if (editor) {
                editor.chain()
                    .deleteRange({ from: startPos, to: startPos + lastInsertLength })
                    .insertContentAt(startPos, currentSessionTranscript)
                    .run();

                lastInsertLength = currentSessionTranscript.length;
                transcriptRef.current = currentSessionTranscript;
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech error", event.error);
            setIsListening(false);
        };

        recognition.onend = async () => {
            setIsListening(false);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            const rawText = transcriptRef.current;
            if (rawText && rawText.trim().length > 0 && onAiPolish) {
                try {
                    const polished = await onAiPolish(rawText);

                    if (editor && polished) {
                        editor.chain()
                            .deleteRange({ from: startPos, to: startPos + lastInsertLength })
                            .insertContentAt(startPos, polished + " ")
                            .run();
                    }
                } catch (e) {
                    console.error("Polish failed", e);
                }
            }
        };
        recognition.start();
    }, [editor, isListening, onAiPolish]);

    // Clean up content: If it has markdown symbols but is being set as HTML, 
    // TipTap might not parse it. The Markdown extension helps here.
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content, { emitUpdate: false });
        }
    }, [content, editor]);

    if (!editor) {
        return <div className={styles.tiptapEditorPlaceholder}>Loading editor...</div>;
    }

    return (
        <div className={styles.tiptapEditor}>
            <MenuBar editor={editor} onMicClick={startDictation} isListening={isListening} />
            <div className={styles.tiptapEditorContent}>
                <EditorContent editor={editor} />
            </div>
            {editor && (
                <BubbleMenu className={styles.bubbleMenuWrapper} editor={editor} updateDelay={100}>
                    <div className={styles.bubbleMenuContainer}>
                        <button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={`${styles.toolbarBtn} ${editor.isActive('bold') ? styles.toolbarBtnActive : ''}`}
                        >
                            <Bold size={16} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={`${styles.toolbarBtn} ${editor.isActive('italic') ? styles.toolbarBtnActive : ''}`}
                        >
                            <Italic size={16} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            className={`${styles.toolbarBtn} ${editor.isActive('underline') ? styles.toolbarBtnActive : ''}`}
                        >
                            <UnderlineIcon size={16} strokeWidth={2.5} />
                        </button>
                        <div className={styles.toolbarSeparator} style={{ height: '1rem', margin: '0 4px' }} />
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            className={`${styles.toolbarBtn} ${editor.isActive('heading', { level: 1 }) ? styles.toolbarBtnActive : ''}`}
                        >
                            <Heading1 size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                </BubbleMenu>
            )}
        </div>
    );
};

export default RichTextMailEditor;
