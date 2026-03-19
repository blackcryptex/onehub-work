// lib/chat.service.ts (stub)
export async function openVendorChatThread(vendorId: string) {
  await new Promise(r => setTimeout(r, 150));
  return { ok: true, threadId: `chat-${vendorId}` };
}

