import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Sparkles,
} from 'lucide-react';
import { AssistantMessage, ScreenType, DiagnosisRecord, WeatherCondition } from '../../types';
import { assistantService } from '../../services/assistantService';

interface AssistantScreenProps {
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  onNavigate: (screen: ScreenType) => void;
  activeDiagnosis?: DiagnosisRecord;
  weather?: WeatherCondition;
}

export const AssistantScreen: React.FC<AssistantScreenProps> = ({
  initialQuery,
  onClearInitialQuery,
  activeDiagnosis,
  weather,
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      timestamp: 'Just now',
      text: 'Good day, Patel Farm. I am your AgriSmart Advisor. I currently monitor Field A (Tomato Early Blight detected) and our upcoming 82% rain event. How can I assist your field decisions?',
      contextTag: 'Patel Farm • Field A & Weather Context Active',
      actionSuggestions: [
        'What should I do about Tomato Early Blight?',
        'Can I irrigate Field A today?',
        'Explain this in simple language.',
        'What should I check tomorrow?',
      ],
      language: 'en',
    },
  ]);

  const [inputVal, setInputVal] = useState<string>('');
  const [isVoiceRecording, setIsVoiceRecording] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle pre-filled query if passed from Diagnosis Result
  useEffect(() => {
    if (initialQuery) {
      handleUserSubmit(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  const currentPrompts = [
    'What should I do about Tomato Early Blight?',
    'Can I irrigate Field A today?',
    'Explain this disease in simple terms.',
    'How serious is this infection?',
    'What should I check tomorrow morning?',
    'What bio-fungicide dosage is recommended?',
  ];

  const handleUserSubmit = async (queryText: string) => {
    if (!queryText.trim() || isTyping) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: queryText,
      language: 'en',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    try {
      const botResponse = await assistantService.sendQuery(queryText, 'en', {
        farmName: 'Patel Farm',
        activeDiagnosis,
        weather,
        soilMoisture: 31,
      });
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('Failed to get advisor response:', error);
      const fallbackMsg: AssistantMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: 'I encountered an issue processing that query. Please try asking again or select one of the suggested topics.',
        language: 'en',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleVoiceRecording = () => {
    if (isVoiceRecording) {
      setIsVoiceRecording(false);
    } else {
      setIsVoiceRecording(true);
      // Simulate voice input capturing
      setTimeout(() => {
        setIsVoiceRecording(false);
        setInputVal('Can I irrigate Field A today?');
      }, 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          AgriSmart Advisor
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Agronomic advisory grounded in your real-time sensor telemetry and weather forecast.
        </p>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-3.5 space-y-2">
        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Suggested Queries
        </div>
        <div className="flex flex-wrap gap-1.5">
          {currentPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleUserSubmit(prompt)}
              className="text-xs text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-400 bg-slate-50 dark:bg-slate-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 px-2.5 py-1 rounded-md transition-all hover:-translate-y-px text-left cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Main Conversation Stream — hugs its content (so a short chat, like
          just the welcome message, never leaves dead space or forces a
          page scroll) but is capped at a max height once the conversation
          grows, at which point the message list scrolls internally while
          the header and input bar stay pinned in place. */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col max-h-[480px] sm:max-h-[560px] overflow-hidden">
        {/* Chat header */}
        <div className="shrink-0 flex items-center gap-2.5 px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-emerald-800 dark:bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">AgriSmart Advisor</div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Online · Replies instantly</div>
          </div>
        </div>

        {/* Scrollable message list — internal scroll, no visible scrollbar */}
        <div className="scrollbar-hide flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 pt-4 pb-2 space-y-4">
          {messages.map((msg) => {
            const isBot = msg.sender === 'assistant';

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isBot ? '' : 'flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-medium shadow-xs ${
                    isBot
                      ? 'bg-emerald-800 dark:bg-emerald-700 text-white'
                      : 'bg-slate-800 dark:bg-slate-700 text-white'
                  }`}
                >
                  {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isBot
                      ? 'bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-md'
                      : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-tr-md'
                  }`}
                >
                  {/* Context Tag if provided */}
                  {msg.contextTag && (
                    <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded mb-2 w-fit">
                      {msg.contextTag}
                    </div>
                  )}

                  {/* Render content */}
                  <div className="space-y-1.5 whitespace-pre-line">
                    {msg.text}
                  </div>

                  {/* Follow-up suggestion buttons */}
                  {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase block">
                        Related Actions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.actionSuggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleUserSubmit(sug)}
                            className="text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 px-2 py-0.5 rounded-md transition-all hover:-translate-y-px cursor-pointer"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-[10px] mt-1.5 flex justify-end ${
                      isBot ? 'text-slate-400 dark:text-slate-500' : 'text-slate-300 dark:text-slate-600'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}
          {isTyping && (
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-emerald-800 dark:bg-emerald-700 text-white">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-md p-3 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 dark:bg-emerald-400 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 dark:bg-emerald-400 animate-pulse [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 dark:bg-emerald-400 animate-pulse [animation-delay:300ms]" />
                </div>
                <span>AgriSmart Advisor is reviewing farm telemetry...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with Voice UI — pinned to the bottom of the card */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {isVoiceRecording && (
            <div className="mb-2.5 p-2.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                <span className="font-medium">Listening...</span>
                <span className="text-slate-500 dark:text-slate-400">Speak clearly into microphone</span>
              </div>
              <button
                type="button"
                onClick={() => setIsVoiceRecording(false)}
                className="font-medium text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUserSubmit(inputVal);
            }}
            className="flex items-center gap-2"
          >
            {/* Voice toggle button */}
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={`p-2.5 rounded-full border transition-all cursor-pointer shadow-xs shrink-0 ${
                isVoiceRecording
                  ? 'bg-rose-700 text-white border-rose-800'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-emerald-300 dark:hover:border-emerald-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
              title={isVoiceRecording ? 'Stop recording' : 'Voice input'}
              aria-label="Voice input"
            >
              {isVoiceRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Text input */}
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask about crops, diseases, irrigation timing, or weather impact..."
              className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!inputVal.trim() || isTyping}
              className="p-2.5 rounded-full bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white transition-all disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-xs cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-px active:translate-y-0 shrink-0"
              aria-label="Send query"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
