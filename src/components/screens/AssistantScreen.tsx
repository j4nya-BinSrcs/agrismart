import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Globe,
  Sparkles,
  Bot,
  User,
  Volume2,
  VolumeX,
  CheckCircle2,
  ArrowRight,
  Leaf,
  Droplets,
  CloudRain,
  HelpCircle,
} from 'lucide-react';
import { AssistantMessage, Language, ScreenType } from '../../types';

interface AssistantScreenProps {
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const AssistantScreen: React.FC<AssistantScreenProps> = ({
  initialQuery,
  onClearInitialQuery,
  currentLanguage,
  onLanguageChange,
  onNavigate,
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
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const handleUserSubmit = (queryText: string) => {
    if (!queryText.trim()) return;

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

    // Generate intelligent, structured agricultural advisor response
    setTimeout(() => {
      const botResponse = generateAgriculturalResponse(queryText, currentLanguage);
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 550);
  };

  const generateAgriculturalResponse = (
    query: string,
    lang: Language
  ): AssistantMessage => {
    const q = query.toLowerCase();

    // Gujarati Responses
    if (lang === 'gu') {
      if (q.includes('પિયત') || q.includes('પાણી') || q.includes('irrigate')) {
        return {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `ખેડૂત મિત્ર રમેશભાઈ, **આજે પિયત બિલકુલ ન આપો.**\n\n- **કારણ:** આગામી ૨૪ કલાકમાં ૮૨% વરસાદની શક્યતા છે (~૧૪.૫ મિમી વરસાદ).\n- **ખેતર સ્થિતિ:** ખેતર A માં જમીનનો ભેજ ૩૧% છે, વરસાદથી કુદરતી રીતે ભેજ ૪૮% થઈ જશે.\n- **ભલામણ:** મોટર ચાલુ ન કરશો. વરસાદ પછી આવતીકાલે સાંજે સેન્સર ચેક કરીશું.`,
          contextTag: 'ખેતર A • પિયત સલાહ',
          actionSuggestions: [
            'વરસાદ પછી દવા ક્યારે છાંટવી?',
            'ટામેટાના પાન સુકાઈ ગયા છે તે કાપી નાખવા?',
          ],
          language: 'gu',
        };
      }

      return {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `ટામેટાના **અર્લી બ્લાઈટ (સુકારો)** માટે તાત્કાલિક પગલાં:\n\n૧. **ચેપી પાન દૂર કરો:** નીચેના પીળા અને કાળા ડાઘવાળા પાન કાપીને થેલીમાં ભરી ખેતર બહાર ખાડામાં દાટી દો.\n૨. **છંટકાવ મોકૂફ રાખો:** આજે બપોરે વરસાદ આવવાનો હોવાથી દવા ધોવાઈ જશે. શુક્રવારે સવારે તાંબા યુક્ત દવા (કોપર હાઇડ્રોક્સાઇડ ૨ ગ્રામ/લિટર) છાંટો.\n૩. **ગંભીરતા:** મધ્યમ (Moderate) છે. જો પાન કાપી લેશો તો પાક સંપૂર્ણ બચી જશે.`,
        contextTag: 'ટામેટા • પાક સંરક્ષણ',
        actionSuggestions: ['શું આજે ખાતર આપી શકાય?', 'ખેતર B કપાસની સ્થિતિ શું છે?'],
        language: 'gu',
      };
    }

    // Hindi Responses
    if (lang === 'hi') {
      if (q.includes('सिंचाई') || q.includes('पानी') || q.includes('irrigate')) {
        return {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `किसान भाई रमेश जी, **आज सिंचाई रोक दीजिए।**\n\n- **मौसम पूर्वानुमान:** अगले 24 घंटों में 82% बारिश (लगभग 14.5 मिमी) की संभावना है।\n- **सलाह:** यदि आज पंप चलाएंगे तो जड़ों में पानी भरने से फफूंद तेजी से फैलेगी। बारिश से जमीन अपने आप रिचार्ज हो जाएगी।\n- **बचत:** आज पंप बंद रखने से 1,850 लीटर पानी और बिजली की बचत होगी।`,
          contextTag: 'सिंचाई नियंत्रण • पटेल फार्म',
          actionSuggestions: ['दवा का छिड़काव कब करें?', 'क्या बारिश से टमाटर खराब होंगे?'],
          language: 'hi',
        };
      }

      return {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `टमाटर के **अर्ली ब्लाइट (अगेती झुलसा)** के लिए अनुशंसित कार्ययोजना:\n\n1. **संक्रमित पत्तियां हटाएं:** पौधे के निचले हिस्से की धब्बेदार पत्तियां काटकर खेत से दूर नष्ट करें।\n2. **छिड़काव स्थगित रखें:** आज बारिश के कारण दवा धुलने का खतरा है। शुक्रवार सुबह कॉपर ऑक्सीक्लोराइड (2.5 ग्राम/लीटर) या ट्राइकोडर्मा का छिड़काव करें।\n3. **गंभीरता:** मध्यम स्तर (91% निश्चितता)। समय पर पत्तियां हटाने से रोग ऊपर नहीं फैलेगा।`,
        contextTag: 'रोग प्रबंधन • खेत A',
        actionSuggestions: ['दवा का घोल कितना बनाना है?', 'कल सुबह क्या जांचें?'],
        language: 'hi',
      };
    }

    // English Responses (Structured agronomic response)
    if (q.includes('irrigate') || q.includes('water') || q.includes('pump')) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `**Decision: Hold irrigation on Field A and Field C today.**\n\n• **Weather Synchronization:** An 82% precipitation probability is forecast for the Anand cluster, bringing an estimated 14.5 mm of rainfall starting this afternoon (~2:00 PM).\n• **Root Zone Moisture:** Field A is currently at 31% volumetric soil moisture. Imminent rainfall will naturally replenish root levels to the optimal 48% target.\n• **Agronomic Risk:** Irrigating prior to heavy rain causes surface pooling, suffocates fine root hairs, and creates high canopy humidity that accelerates Alternaria fungal spore spread.\n• **Action:** Keep irrigation pumps idle today. Re-evaluate sensor moisture logs tomorrow morning at 7:00 AM.`,
        contextTag: 'Irrigation Advisory • Sensor Synced',
        actionSuggestions: [
          'What should I check tomorrow morning?',
          'When is the next safe foliar spraying window?',
        ],
        language: 'en',
      };
    }

    if (q.includes('how serious') || q.includes('severity')) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `**Severity Assessment: Moderate (Early Stage Containment)**\n\n• **Infection Scope:** Lesions are currently restricted to lower 20% of canopy on Field A (Plot 2). Stems and fruit clusters are clear of dark cankers.\n• **Yield Impact Risk:** If lower leaves are pruned prior to today's rain, projected yield loss is <3%.\n• **Urgency:** If left untreated during the rainstorm, spore splash will spread pathogen to flowering clusters within 48 hours.\n• **Action Required:** Physical leaf pruning must be finished before 11:30 AM today.`,
        contextTag: 'Severity & Yield Risk Analysis',
        actionSuggestions: [
          'What bio-fungicide dosage is recommended?',
          'Explain this in simple Gujarati or Hindi',
        ],
        language: 'en',
      };
    }

    return {
      id: `bot-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `**Treatment Advisory for Tomato Early Blight (Alternaria solani):**\n\n1. **Immediate Cultural Action (Today before 11:30 AM):**\n   • Prune off all lower leaves showing concentric brown 'target' spots.\n   • Seal clipped debris in bags and remove from field (do NOT compost).\n\n2. **Weather Synchronization (Spray Timing):**\n   • **Do not spray chemicals today.** Rain forecast (82%) will wash away foliar treatment.\n   • Spray window opens **Friday, Sep 12 at 7:00 AM** during calm, dry morning.\n\n3. **Recommended Formulation:**\n   • Copper Hydroxide (2.0 g/L) OR Bio-agent Trichoderma viride (5 g/L).\n   • Target underside of leaves where stomata allow fungal penetration.\n\n4. **Mulching:**\n   • Lay dry organic straw beneath vines to stop soil-borne spore splash during rain.`,
      contextTag: 'Crop Protection • Field A (Tomato)',
      actionSuggestions: [
        'Can I irrigate Field A today?',
        'How does this affect my sustainability score?',
      ],
      language: 'en',
    };
  };

  const toggleVoiceRecording = () => {
    if (!isVoiceRecording) {
      setIsVoiceRecording(true);
      // Simulate speech-to-text capture
      setTimeout(() => {
        setIsVoiceRecording(false);
        if (currentLanguage === 'gu') {
          handleUserSubmit('શું આજે ટામેટામાં દવા છાંટી શકાય?');
        } else if (currentLanguage === 'hi') {
          handleUserSubmit('क्या आज टमाटर में दवा का छिड़काव कर सकते हैं?');
        } else {
          handleUserSubmit('Can I spray fungicide on my tomatoes before the rain?');
        }
      }, 2500);
    } else {
      setIsVoiceRecording(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      {/* Title & Assistant Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-emerald-800 text-white flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                Farmer Advisory Assistant
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-medium bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                Active Context
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Patel Farm • Field A Tomato Telemetry & Weather Integrated
            </p>
          </div>
        </div>

        {/* Language Selector Segmented Control */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md border border-slate-200 text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              currentLanguage === 'en'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('hi')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              currentLanguage === 'hi'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            हिन्दी
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('gu')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              currentLanguage === 'gu'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ગુજરાતી
          </button>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2">
        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
          Suggested Queries
        </div>
        <div className="flex flex-wrap gap-1.5">
          {currentPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleUserSubmit(prompt)}
              className="text-xs text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md transition-colors text-left cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 min-h-[420px] flex flex-col justify-between">
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
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs font-medium ${
                    isBot
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-800 text-white'
                  }`}
                >
                  {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-lg p-3.5 text-xs sm:text-sm leading-relaxed ${
                    isBot
                      ? 'bg-slate-50 text-slate-900 border border-slate-200'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  {/* Context Tag if provided */}
                  {msg.contextTag && (
                    <div className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded mb-2 w-fit">
                      {msg.contextTag}
                    </div>
                  )}

                  {/* Render content */}
                  <div className="space-y-1.5 whitespace-pre-line">
                    {msg.text}
                  </div>

                  {/* Follow-up suggestion buttons */}
                  {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-medium text-slate-500 uppercase block">
                        Related Actions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.actionSuggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleUserSubmit(sug)}
                            className="text-xs bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-2 py-0.5 rounded transition-colors cursor-pointer"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-[10px] mt-1.5 flex justify-end ${
                      isBot ? 'text-slate-400' : 'text-slate-400'
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
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-emerald-800 text-white">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="rounded-lg p-3 text-xs bg-slate-50 text-slate-600 border border-slate-200 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse [animation-delay:300ms]" />
                </div>
                <span>AgriSmart Advisor is reviewing farm telemetry...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with Voice UI */}
        <div className="pt-3 border-t border-slate-200">
          {isVoiceRecording && (
            <div className="mb-2.5 p-2.5 rounded-md bg-slate-50 border border-slate-300 text-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                <span className="font-medium">Listening in {currentLanguage.toUpperCase()}...</span>
                <span className="text-slate-500">Speak clearly into microphone</span>
              </div>
              <button
                type="button"
                onClick={() => setIsVoiceRecording(false)}
                className="font-medium text-rose-700 hover:underline"
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
              className={`p-2.5 rounded-md border transition-colors cursor-pointer ${
                isVoiceRecording
                  ? 'bg-rose-700 text-white border-rose-800'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title={isVoiceRecording ? 'Stop recording' : 'Voice input'}
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
              className="flex-1 bg-white border border-slate-200 rounded-md px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-400"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="p-2.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
