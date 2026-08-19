import { NextRequest, NextResponse } from 'next/server';
import { getSmartLinkActor } from '@/lib/auth';
import { buildChatSnapshot, chatSystemPrompt } from '@/lib/admin-chat';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

function sanitizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is ChatMessage => {
      return (
        item &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string' &&
        item.content.trim().length > 0
      );
    })
    .slice(-MAX_MESSAGES)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }));
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getSmartLinkActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chat is not configured. Add DEEPSEEK_API_KEY to .env.local and restart the server.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const messages = sanitizeMessages(body.messages);
    const lastUser = [...messages].reverse().find((message) => message.role === 'user');
    if (!lastUser) {
      return NextResponse.json({ error: 'A question is required' }, { status: 400 });
    }

    const snapshot = await buildChatSnapshot(actor);

    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: 'system', content: chatSystemPrompt(actor) },
          { role: 'system', content: snapshot },
          ...messages,
        ],
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error('DeepSeek chat error:', data);
      return NextResponse.json(
        { error: data.error?.message || 'The assistant could not answer right now. Try again.' },
        { status: 502 }
      );
    }

    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return NextResponse.json({ error: 'No answer was returned. Try again.' }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Admin chat error:', error);
    return NextResponse.json({ error: 'Failed to get an answer' }, { status: 500 });
  }
}
