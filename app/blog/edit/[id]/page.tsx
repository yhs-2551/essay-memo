"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BlogEditor } from "@/components/blog-editor";
import { Background } from "@/components/background";
import { Stars } from "lucide-react";

export default function EditPostPage() {
    const { id } = useParams();
    const [post, setPost] = useState<any>(null);
    const [consultation, setConsultation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (id) {
            fetchPost();
        }
    }, [id]);

    const fetchPost = async () => {
        try {
            const res = await fetch(`/api/posts/${id}`);
            if (res.ok) {
                const data = await res.json();
                setPost(data.post);
                setConsultation(data.consultation);
            } else {
                router.push("/blog");
            }
        } catch (e) {
            console.error(e);
            router.push("/blog");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className='min-h-screen flex items-center justify-center'>
                <Background />
                <div className='text-center animate-pulse'>
                    <Stars className='h-10 w-10 mx-auto mb-4 text-purple-500' />
                    <p className='text-muted-foreground'>기록을 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (!post) return null;

    return (
        <BlogEditor
            isEditing
            initialData={{
                id: post.id,
                title: post.title,
                content: post.content,
                mode: post.mode,
            }}
            initialConsultation={consultation}
        />
    );
}
