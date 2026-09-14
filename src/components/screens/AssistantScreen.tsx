import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Sparkles,
  RotateCcw,
  Languages,
} from 'lucide-react';
import { AssistantMessage, ScreenType, DiagnosisRecord, WeatherCondition, IrrigationPlan, Language } from '../../types';
import { assistantService } from '../../services/assistantService';
import { useAuth } from '../../context/AuthContext';

interface AssistantScreenProps {
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  onNavigate: (screen: ScreenType) => void;
  activeDiagnosis?: DiagnosisRecord;
  weather?: WeatherCondition;
  irrigation?: IrrigationPlan;
}

const LANGUAGE_LABELS: Record<Language, { label: string; native: string }> = {
  en: { label: 'English', native: 'EN' },
  hi: { label: 'Hindi', native: 'हिंदी' },
  gu: { label: 'Gujarati', native: 'ગુજરાતી' },
};

const SUGGESTED_PROMPTS_BY_LANG: Record<Language, string[]> = {
  en: [
    'Should I irrigate my fields today?',
    'What is the rain forecast for the next 24 hours?',
    'Explain current crop disease status in simple terms.',
    'What precautions should I take before spraying?',
    'What should I inspect tomorrow morning?',
  ],
  hi: [
    'क्या आज मुझे खेतों में सिंचाई करनी चाहिए?',
    'अगले 24 घंटों में बारिश का क्या पूर्वानुमान है?',
    'फसल रोग की स्थिति को आसान भाषा में समझाएं।',
    'छिड़काव करने से पहले क्या सावधानियां बरतें?',
    'कल सुबह खेत में क्या जांचना चाहिए?',
  ],
  gu: [
    'શું આજે ખેતરમાં પિયત આપવું જોઈએ?',
    'આગામી ૨૪ કલાકમાં વરસાદની શું આગાહી છે?',
    'પાકના રોગની સ્થિતિ સરળ ભાષામાં સમજાવો.',
    'દવા છાંટતા પહેલા કઈ કાળજી રાખવી?',
    'આવતીકાલે સવારે ખેતરમાં શું તપાસવું?',
  ],
};

const detectDominantScript = (text: string, fallback: Language = 'en'): Language => {
  if (!text || typeof text !== 'string') return fallback;
  const gujaratiCount = (text.match(/[\u0A80-\u0AFF]/g) || []).length;
  const hindiCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;

  if (gujaratiCount > 0 && gujaratiCount >= hindiCount && gujaratiCount >= latinCount) {
    return 'gu';
  }
  if (hindiCount > 0 && hindiCount >= gujaratiCount && hindiCount >= latinCount) {
    return 'hi';
  }
  if (latinCount > 0 && latinCount > gujaratiCount && latinCount > hindiCount) {
    return 'en';
  }
  return fallback;
};

export const FormattedAssistantMessage: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Check if line is a bullet item (starting with • or * or -)
        const isBullet = /^[•*\-]\s+/.test(trimmed);
        if (isBullet) {
          const bulletContent = trimmed.replace(/^[•*\-]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5 text-slate-800 dark:text-slate-200">
              <span className="text-emerald-700 dark:text-emerald-400 select-none text-sm leading-tight">•</span>
              <span className="flex-1">{renderFormattedText(bulletContent)}</span>
            </div>
          );
        }

        // Check if line is a section heading (e.g. Current conditions, Recommendation, Next check, etc.)
        const isHeading =
          /^(###|##|#)\s+/.test(trimmed) ||
          /^(Current conditions|Recommendation|Recommendations|Next check|Field observations|Immediate actions|What happened\?|What should I do now\?|What should I avoid\?|When should I check again\?|હાલની સ્થિતિ|ભલામણ|આગામી તપાસ|પિયત નિર્ણય|વર્તમાન સ્થિતિ|वर्तमान स्थिति|सिफारिश|अगली जांच|सिंचाई निर्णय):?$/i.test(
            trimmed.replace(/\*\*/g, '').trim()
          );

        if (isHeading) {
          const cleanHeading = trimmed.replace(/^(###|##|#)\s+/, '').replace(/\*\*/g, '').replace(/:$/, '');
          return (
            <div key={idx} className="font-semibold text-slate-900 dark:text-slate-100 pt-1.5 pb-0.5 text-xs sm:text-sm">
              {cleanHeading}
            </div>
          );
        }

        // Standard paragraph line
        return (
          <div key={idx} className="text-slate-800 dark:text-slate-200">
            {renderFormattedText(trimmed)}
          </div>
        );
      })}
    </div>
  );
};

function renderFormattedText(text: string): React.ReactNode {
  let clean = text.replace(/^(###|##|#)\s+/, '');

  // Parse **bold** tokens cleanly into <strong> tags without showing raw asterisks
  const parts = clean.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-white">
          {inner}
        </strong>
      );
    }
    return part;
  });
}

export const AssistantScreen: React.FC<AssistantScreenProps> = ({
  initialQuery,
  onClearInitialQuery,
  activeDiagnosis,
  weather,
  irrigation,
}) => {
  const { user } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  const getWelcomeMessage = (lang: Language): AssistantMessage => {
    if (lang === 'gu') {
      return {
        id: 'welcome-1',
        sender: 'assistant',
        timestamp: 'હમણાં',
        text: 'નમસ્તે ખેડૂત મિત્ર! હું તમારો એગ્રીસ્માર્ટ કૃષિ સલાહકાર છું. તમારા ખેતરના સેન્સર, હવામાન અને પિયત ડેટા સાથે હું જોડાયેલ છું. હું તમને કેવી રીતે મદદ કરી શકું?',
        contextTag: 'એગ્રીસ્માર્ટ • રીયલ-ટાઇમ કનેક્ટેડ',
        actionSuggestions: SUGGESTED_PROMPTS_BY_LANG.gu.slice(0, 4),
        language: 'gu',
      };
    }
    if (lang === 'hi') {
      return {
        id: 'welcome-1',
        sender: 'assistant',
        timestamp: 'अभी',
        text: 'नमस्ते किसान भाई! मैं आपका एग्रीस्मार्ट कृषि सलाहकार हूँ। मैं आपके खेत के सेंसर, मौसम पूर्वानुमान और सिंचाई डेटा से जुड़ा हुआ हूँ। मैं आपकी क्या सहायता कर सकता हूँ?',
        contextTag: 'एग्रीस्मार्ट • रियल-टाइम कनेक्टेड',
        actionSuggestions: SUGGESTED_PROMPTS_BY_LANG.hi.slice(0, 4),
        language: 'hi',
      };
    }
    return {
      id: 'welcome-1',
      sender: 'assistant',
      timestamp: 'Just now',
      text: 'Good day! I am your AgriSmart Advisor, grounded directly in your verified field sensors, weather forecasts, and irrigation recommendations. How can I assist your field operations today?',
      contextTag: 'AgriSmart • Real-Time Telemetry Connected',
      actionSuggestions: SUGGESTED_PROMPTS_BY_LANG.en.slice(0, 4),
      language: 'en',
    };
  };

  const [messages, setMessages] = useState<AssistantMessage[]>([getWelcomeMessage('en')]);
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

  const currentPrompts = SUGGESTED_PROMPTS_BY_LANG[selectedLanguage] || SUGGESTED_PROMPTS_BY_LANG.en;

  const handleLanguageChange = (newLang: Language) => {
    setSelectedLanguage(newLang);
    // If only welcome message is present, update it
    if (messages.length === 1 && messages[0].id === 'welcome-1') {
      setMessages([getWelcomeMessage(newLang)]);
    }
  };

  const handleUserSubmit = async (queryText: string) => {
    if (!queryText.trim() || isTyping) return;

    // Detect language of this exact message based on dominant script
    const messageLang = detectDominantScript(queryText, selectedLanguage);

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: queryText,
      language: messageLang,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);
    setLastFailedQuery(null);

    try {
      const botResponse = await assistantService.sendQuery(queryText, messageLang, {
        farmName: user?.farmName || 'Patel Farm',
        crop: 'Tomato & Cotton',
        activeDiagnosis,
        weather,
        irrigation,
        soilMoisture: irrigation?.zones?.[0]?.soilMoistureCurrent ?? 31,
      });
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('Failed to get advisor response:', error);
      setLastFailedQuery(queryText);
      
      const errorText = messageLang === 'gu'
        ? 'સર્વર અથવા AI મોડેલ સાથે જોડાણમાં સમસ્યા આવી. કૃપા કરીને ફરી પ્રયાસ કરો.'
        : (messageLang === 'hi'
            ? 'सर्वर या AI मॉडल से कनेक्ट करने में समस्या आई। कृपया पुनः प्रयास करें।'
            : 'I encountered an issue connecting to the AI Assistant service. Please try again.');

      const fallbackMsg: AssistantMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: errorText,
        language: messageLang,
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
      // Voice input simulation
      setTimeout(() => {
        setIsVoiceRecording(false);
        const sampleVoiceQuery = selectedLanguage === 'gu'
          ? 'શું આજે ખેતરમાં પિયત આપવું જોઈએ?'
          : (selectedLanguage === 'hi'
              ? 'क्या आज मुझे सिंचाई करनी चाहिए?'
              : 'Should I irrigate my fields today?');
        setInputVal(sampleVoiceQuery);
      }, 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Language Bar */}
      <div className="pb-2 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            AgriSmart Advisor
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Agronomic advisory grounded in real-time sensor telemetry, weather forecasts, and irrigation calculations.
          </p>
        </div>

        {/* Language selector toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
          <Languages className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ml-1.5 mr-0.5" />
          {(['en', 'hi', 'gu'] as Language[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLanguageChange(lang)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                selectedLanguage === lang
                  ? 'bg-emerald-800 dark:bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              aria-label={`Switch language to ${LANGUAGE_LABELS[lang].label}`}
            >
              {LANGUAGE_LABELS[lang].native}
            </button>
          ))}
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-3.5 space-y-2">
        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {selectedLanguage === 'gu' ? 'સૂચવેલા પ્રશ્નો' : (selectedLanguage === 'hi' ? 'सुझाए गए प्रश्न' : 'Suggested Queries')}
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

      {/* Main Conversation Stream */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col max-h-[480px] sm:max-h-[560px] overflow-hidden">
        {/* Chat header */}
        <div className="shrink-0 flex items-center justify-between gap-2.5 px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-emerald-800 dark:bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                AgriSmart Advisor ({LANGUAGE_LABELS[selectedLanguage].native})
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                Grounded in Farm Telemetry · Live
              </div>
            </div>
          </div>

          {lastFailedQuery && (
            <button
              type="button"
              onClick={() => handleUserSubmit(lastFailedQuery)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-md hover:bg-amber-100 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>

        {/* Scrollable message list */}
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
                  {isBot ? (
                    <FormattedAssistantMessage text={msg.text} />
                  ) : (
                    <div className="whitespace-pre-line">{msg.text}</div>
                  )}

                  {/* Follow-up suggestion buttons */}
                  {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase block">
                        {selectedLanguage === 'gu' ? 'સંબંધિત પગલાં:' : (selectedLanguage === 'hi' ? 'संबंधित सुझाव:' : 'Related Actions:')}
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
                <span>
                  {selectedLanguage === 'gu'
                    ? 'એગ્રીસ્માર્ટ એડવાઈઝર ફાર્મ ડેટા ચકાસી રહ્યું છે...'
                    : (selectedLanguage === 'hi'
                        ? 'एग्रीस्मार्ट सलाहकार खेत के डेटा की समीक्षा कर रहा है...'
                        : 'AgriSmart Advisor is reviewing farm telemetry...')}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with Voice UI */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {isVoiceRecording && (
            <div className="mb-2.5 p-2.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                <span className="font-medium">
                  {selectedLanguage === 'gu' ? 'સાંભળી રહ્યા છીએ...' : (selectedLanguage === 'hi' ? 'सुन रहे हैं...' : 'Listening...')}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {selectedLanguage === 'gu' ? 'માઇક્રોફોનમાં બોલો' : (selectedLanguage === 'hi' ? 'माइक में स्पष्ट बोलें' : 'Speak clearly into microphone')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsVoiceRecording(false)}
                className="font-medium text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
              >
                {selectedLanguage === 'gu' ? 'રદ કરો' : (selectedLanguage === 'hi' ? 'रद्द करें' : 'Cancel')}
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
              placeholder={
                selectedLanguage === 'gu'
                  ? 'પાક, રોગ, પિયત સમય અથવા હવામાન વિશે પૂછો...'
                  : (selectedLanguage === 'hi'
                      ? 'फसल, रोग, सिंचाई समय या मौसम के प्रभाव के बारे में पूछें...'
                      : 'Ask about crops, diseases, irrigation timing, or weather impact...')
              }
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

export default AssistantScreen;
