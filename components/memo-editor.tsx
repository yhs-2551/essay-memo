"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Save, X, ImageIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useNavigationWarning } from "@/hooks/use-navigation-warning";
import { ImageUploadButton } from "@/components/image-upload-button";
import { ImagePreviewStrip } from "@/components/image-preview-strip";
import { useAutoSave } from "@/hooks/use-auto-save";
import { toast } from "sonner";

interface MemoEditorProps {
    initialContent?: string;
    onSave: (content: string) => Promise<void>;
    onCancel?: () => void;
    placeholder?: string;
    autoFocus?: boolean;
    className?: string;
}

export function MemoEditor({
    initialContent = "",
    onSave,
    onCancel,
    placeholder = "무슨 생각을 하고 계신가요?",
    autoFocus = false,
    className = "",
}: MemoEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { handlePaste, isUploading } = useImageUpload();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const hasUnsavedChanges = content !== (initialContent || "") && content.trim() !== "";
    useNavigationWarning(hasUnsavedChanges);

    // [Orbit Sync Engine]: Auto-Save Hook Integration
    const { isSaving, loadDraft, clearDraft } = useAutoSave<{ content: string; images: string[] }>(
        "draft-memo-new",
        { content, images: uploadedImages },
        2000
    );

    useEffect(() => {
        setMounted(true);
        if (autoFocus) {
            textareaRef.current?.focus();
        }

        // Load Draft
        const restoreDraft = async () => {
            const draft = await loadDraft();
            if (draft && (draft.content || draft.images?.length)) {
                toast("작성 중인 메모가 있습니다.", {
                    action: {
                        label: "복구",
                        onClick: () => {
                            if (draft.content) setContent(draft.content);
                            if (draft.images) setUploadedImages(draft.images);
                            toast.success("메모 복구 완료");
                        },
                    },
                    cancel: { label: "삭제", onClick: clearDraft },
                });
            }
        };
        restoreDraft();
    }, [autoFocus, loadDraft, clearDraft]);

    const handleSave = async () => {
        if (!content.trim()) return;
        setLoading(true);
        try {
            const finalContent = uploadedImages.length > 0 ? `${content}\n\n${uploadedImages.map((url) => `![이미지](${url})`).join("\n")}` : content;
            await onSave(finalContent);
            clearDraft(); // [Orbit Sync]: Clear draft after successful save
            if (!initialContent) {
                setContent("");
                setUploadedImages([]);
            }
        } catch (error) {
            console.error("Failed to save memo:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveImage = (url: string) => {
        setUploadedImages((prev) => prev.filter((u) => u !== url));
    };

    return (
        <Card className={`overflow-hidden transition-all border-none bg-background/60 backdrop-blur-xl shadow-2xl ${className}`}>
            <div className='p-4 relative'>
                {/* [Orbit Sync]: Saving Indicator */}
                <div className='absolute top-4 right-4 text-[10px] font-medium text-muted-foreground/50 transition-opacity duration-500'>
                    {isSaving ? "저장 중..." : "저장됨"}
                </div>

                <Textarea
                    ref={textareaRef}
                    placeholder={placeholder}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onPaste={async (e) => {
                        const url = await handlePaste(e);
                        if (url) setUploadedImages((prev) => [...prev, url]);
                    }}
                    className='min-h-[120px] bg-transparent border-none text-base resize-none focus-visible:ring-0 p-0 placeholder:text-muted-foreground/40'
                    disabled={loading || isUploading}
                />

                <ImagePreviewStrip urls={uploadedImages} showRemove onRemove={handleRemoveImage} />

                <div className='flex justify-between items-center mt-4 pt-2 border-t border-border/20'>
                    <div className='flex gap-1'>
                        <ImageUploadButton
                            onUploadComplete={(url) => setUploadedImages((prev) => [...prev, url])}
                            className='hover:bg-primary/10 text-muted-foreground'
                            size='icon'
                            variant='ghost'
                        />
                    </div>
                    <div className='flex gap-2'>
                        {onCancel && (
                            <Button variant='ghost' size='sm' onClick={onCancel} disabled={loading} className='rounded-full'>
                                <X className='w-4 h-4 mr-1' /> 취소
                            </Button>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={loading || isUploading || !content.trim()}
                            variant={mounted ? (theme === "dark" ? "cosmic" : "cute") : "default"}
                            size='sm'
                            className='rounded-full px-6 transition-all hover:scale-105 active:scale-95'
                        >
                            {loading || isUploading ? (
                                <Loader2 className='animate-spin h-4 w-4' />
                            ) : (
                                <span className='flex items-center gap-1.5'>
                                    <Save className='w-4 h-4' />
                                    {initialContent ? "수정" : "저장"}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
