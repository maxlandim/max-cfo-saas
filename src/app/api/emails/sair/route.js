import { adminDb } from '../../../../lib/firebaseAdmin';
import { tokenSairValido } from '../../../../lib/emailsTeste';

export const dynamic = 'force-dynamic';

// Link "não quero receber estes e-mails" dos e-mails do teste grátis
export async function GET(req) {
  const url = new URL(req.url);
  const uid = url.searchParams.get('u') || '';
  const ok = adminDb && tokenSairValido(uid, url.searchParams.get('t'));
  if (ok) await adminDb.collection('emailsTeste').doc(uid).set({ sair: new Date().toISOString() }, { merge: true });
  const msg = ok ? 'Pronto! Você não vai mais receber estes e-mails.' : 'Link inválido ou vencido.';
  return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Landim Advisory</title></head><body style="font-family:Arial,sans-serif;background:#F5F6F8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px"><div style="background:#fff;border:1px solid #E3E6EC;border-radius:14px;padding:28px;max-width:420px;text-align:center"><h1 style="font-size:20px;margin:0 0 10px;color:#0B1220">${msg}</h1><p style="color:#5B6474;margin:0 0 18px">Os avisos de cobrança da sua assinatura continuam chegando normalmente.</p><a href="/" style="color:#0B1220;font-weight:bold">Voltar ao site</a></div></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
