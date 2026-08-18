'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STARTER_QUESTIONS = [
  'How do I create a Smart Link?',
  'Where do I see visitor countries?',
  'How do project users log in?',
];

export default function AdminChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi — I can help with this Admin workspace: Smart Links, projects, users, analytics, leads, and the public viewer. Ask anything about how this project works.',
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    inputRef.current?.focus();
  }, [open, messages, loading]);

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages[0]?.role === 'assistant' ? nextMessages.slice(1) : nextMessages,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not get an answer');
      }
      setMessages([...nextMessages, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not get an answer';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <section className="w-[min(100vw-2.5rem,400px)] h-[min(72vh,560px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <header className="px-4 py-3 bg-[#120C29] text-white flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Nexuses Assistant</p>
              <p className="text-xs text-white/70">Answers about this Admin workspace</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              ×
            </button>
          </header>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'bg-[#120C29] text-white rounded-br-md'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm text-gray-500">
                  Thinking...
                </div>
              </div>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {STARTER_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void sendMessage(question)}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(input);
                  }
                }}
                rows={2}
                placeholder="Ask about Smart Links, analytics, projects..."
                className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#120C29]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="h-10 px-4 rounded-xl bg-[#120C29] text-white text-sm font-medium disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-14 w-14 rounded-full bg-[#120C29] text-white shadow-xl hover:bg-[#1c1540] flex items-center justify-center"
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        {open ? (
          <span className="text-2xl leading-none">×</span>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H9l-4 3.5V6.5Z" />
            <path d="M8.5 9h7M8.5 12.5h4.5" />
          </svg>
        )}
      </button>
    </div>
  );
}
