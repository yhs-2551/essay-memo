"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { l1Storage } from "@/utils/indexed-db";

import { LogIn, LogOut, Loader2, User as UserIcon } from "lucide-react";
import Link from "next/link";

export function UserNav() {
    const { user, loading } = useUser();

    if (loading) {
        return (
            <div className='h-10 w-10 rounded-full bg-muted/20 animate-pulse flex items-center justify-center'>
                <Loader2 className='h-5 w-5 animate-spin text-muted-foreground/50' />
            </div>
        );
    }

    if (!user) {
        return (
            <Link href='/login'>
                <Button variant='ghost' size='sm' className='rounded-full gap-2'>
                    <LogIn className='w-4 h-4' />
                    <span className='hidden sm:inline'>로그인</span>
                </Button>
            </Link>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant='ghost'
                    className='relative h-10 w-10 rounded-full ring-2 ring-indigo-500/20 hover:ring-indigo-500/50 transition-all p-0 overflow-hidden'
                >
                    <Avatar className='h-full w-full'>
                        <AvatarImage src={user.user_metadata.avatar_url} alt={user.email || ""} />
                        <AvatarFallback className='bg-gradient-to-br from-indigo-500 to-purple-500 text-white'>
                            {user.email?.[0].toUpperCase() || <UserIcon className='w-4 h-4' />}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-56' align='end' forceMount>
                <DropdownMenuLabel className='font-normal'>
                    <div className='flex flex-col space-y-1'>
                        <p className='text-sm font-medium leading-none'>{user.user_metadata.full_name || "여행자"}</p>
                        <p className='text-xs leading-none text-muted-foreground truncate'>{user.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className='text-red-500 focus:text-red-500 cursor-pointer'
                    onClick={async () => {
                        const supabase = createClient();
                        await l1Storage.clearAll(); // Orbit L1 Security: Nuke Local Drafts
                        await supabase.auth.signOut();
                        window.location.reload();
                    }}
                >
                    <LogOut className='mr-2 h-4 w-4' />
                    <span>로그아웃</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
