'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logActivity } from '@/lib/logger'

export async function signOut() {
    const supabase = await createClient()
    await logActivity('USER_LOGOUT') // Session is still valid here
    await supabase.auth.signOut()
    redirect('/login')
}
