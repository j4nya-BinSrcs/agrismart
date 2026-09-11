import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Bot,
  User,
} from 'lucide-react';
import { AssistantMessage, Language, ScreenType, DiagnosisRecord, WeatherCondition } from '../../types';
import { assistantService } from '../../services/assistantService';

interface AssistantScreenProps {
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onNavigate: (screen: ScreenType) => void;
  activeDiagnosis?: DiagnosisRecord;
  weather?: WeatherCondition;
}

export const AssistantScreen: React.FC<AssistantScreenProps> = ({
  initialQuery,
  onClearInitialQuery,
  currentLanguage,
  onLanguageChange,
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

  const suggestedPrompts = {
    en: [
      'What should I do about Tomato Early Blight?',
      'Can I irrigate Field A today?',
      'Explain this disease in simple terms.',
      'How serious is this infection?',
      'What should I check tomorrow morning?',
      'What bio-fungicide dosage is recommended?',
    ],
    hi: [
      'टमाटर के अर्ली ब्लाइट रोग के लिए मुझे क्या करना चाहिए?',
      'क्या मैं आज खेत A में सिंचाई कर सकता हूँ?',
      'इसे आसान भाषा में समझाइए।',
      'यह रोग कितना गंभीर है?',
      'मुझे कल सुबह क्या जांचना चाहिए?',
    ],
    gu: [
      'ટામેટાના સુકારા (અર્લી બ્લાઈટ) રોગ માટે મારે શું કરવું?',
      'શું હું આજે ખેતર A માં પિયત આપી શકું?',
      'આ રોગ કેટલો ગંભીર છે?',
      'આ વાત મને સરળ દેશી ભાષામાં સમજાવો.',
      'આવતીકાલે સવારે મારે શું તપાસવું જોઈએ?',
    ],
  };

  const currentPrompts = suggestedPrompts[currentLanguage] || suggestedPrompts.en;

  const handleUserSubmit = async (queryText: string) => {
    if (!queryText.trim() || isTyping) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: queryText,
      language: currentLanguage,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    try {
      const botResponse = await assistantService.sendQuery(queryText, currentLanguage, {
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
        language: currentLanguage,
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
        const voiceQuery =
          currentLanguage === 'gu'
            ? 'શું હું આજે ખેતર A માં પિયત આપી શકું?'
            : currentLanguage === 'hi'
            ? 'क्या मैं आज खेत A में सिंचाई कर सकता हूँ?'
            : 'Can I irrigate Field A today?';
        setInputVal(voiceQuery);
      }, 2500);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Title & Language Bar */}
      <div className="pb-2 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            AgriSmart Advisor
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Agronomic advisory grounded in your real-time sensor telemetry and weather forecast.
          </p>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-md self-start sm:self-auto shadow-xs">
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              currentLanguage === 'en'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('hi')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              currentLanguage === 'hi'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            हिन्दी
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('gu')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              currentLanguage === 'gu'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            ગુજરાતી
          </button>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-2">
        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Suggested Queries
        </div>
        <div className="flex flex-wrap gap-1.5">
          {currentPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleUserSubmit(prompt)}
              className="text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md transition-colors text-left cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-5 min-h-[420px] flex flex-col justify-between">
        <div className="space-y-4 mb-4">
          {messages.map((msg) => {
            const isBot = msg.sender === 'assistant';

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isBot ? '' : 'flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs font-medium shadow-xs ${
                    isBot
                      ? 'bg-emerald-800 dark:bg-emerald-700 text-white'
                      : 'bg-slate-800 dark:bg-slate-700 text-white'
                  }`}
                >
                  {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-lg p-3.5 text-xs sm:text-sm leading-relaxed ${
                    isBot
                      ? 'bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                      : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
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
                            className="text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 px-2 py-0.5 rounded transition-colors cursor-pointer"
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
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-emerald-800 dark:bg-emerald-700 text-white">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="rounded-lg p-3 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
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

        {/* Input Bar with Voice UI */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          {isVoiceRecording && (
            <div className="mb-2.5 p-2.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                <span className="font-medium">Listening in {currentLanguage.toUpperCase()}...</span>
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
              className={`p-2.5 rounded-md border transition-colors cursor-pointer shadow-xs ${
                isVoiceRecording
                  ? 'bg-rose-700 text-white border-rose-800'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
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
              placeholder={
                currentLanguage === 'gu'
                  ? 'ખેતી વિશે અહીં પ્રશ્ન પૂછો... (દા.ત. શું આજે પિયત આપી શકાય?)'
                  : currentLanguage === 'hi'
                  ? 'खेती से जुड़ा सवाल यहाँ पूछें... (उदा. क्या आज सिंचाई करनी चाहिए?)'
                  : 'Ask about crops, diseases, irrigation timing, or weather impact...'
              }
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!inputVal.trim() || isTyping}
              className="p-2.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
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
