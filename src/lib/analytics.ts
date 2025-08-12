import { supabase } from "@/integrations/supabase/client";

// Simple in-memory cache for profile context
let cachedRole: 'admin' | 'user' | 'gestor' | null = null;
let cachedSchoolId: string | null = null;
let cachedUserId: string | null = null;

function parseUA() {
  const ua = navigator.userAgent || '';
  const isMobile = /Mobi|Android/i.test(ua);
  let browser = 'Unknown';
  if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Edg\//.test(ua)) browser = 'Edge';
  let os = 'Unknown';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  return { device: isMobile ? 'mobile' : 'desktop', browser, os };
}

async function ensureContext() {
  if (cachedUserId && cachedRole && cachedSchoolId !== null) return;

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id || null;
  cachedUserId = uid;
  if (!uid) return;

  // Fetch role and school_id once and cache
  const [{ data: roleData }, { data: schoolData }] = await Promise.all([
    supabase.rpc('get_current_user_role' as any),
    supabase.rpc('get_current_user_school_id' as any),
  ]);
  cachedRole = (roleData as any) || 'user';
  cachedSchoolId = (schoolData as any) || null;
}

export type LogEventInput = {
  event_type: string;
  event_name: string;
  properties?: Record<string, any>;
  page?: string;
};

export async function logEvent(input: LogEventInput) {
  try {
    await ensureContext();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;

    const { device, browser, os } = parseUA();

    const payload = {
      user_id: uid,
      user_role: (cachedRole || 'user') as any,
      school_id: cachedSchoolId,
      session_id: (crypto?.randomUUID && sessionStorage.getItem('session_id')) || undefined,
      event_type: input.event_type,
      event_name: input.event_name,
      event_properties: input.properties || null,
      page: input.page || window.location.pathname,
      referrer: document.referrer || null,
      device,
      browser,
      os,
    } as const;

    // Ensure session id exists for this tab
    if (!sessionStorage.getItem('session_id')) {
      try { sessionStorage.setItem('session_id', crypto.randomUUID()); } catch {}
    }

    await supabase.from('usage_events').insert([payload as any]);
  } catch (e) {
    // Do not block UI; just log to console
    console.warn('[analytics] Failed to log event', e);
  }
}
