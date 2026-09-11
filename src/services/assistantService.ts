import { AssistantMessage, AssistantContext, Language } from '../types';

export const assistantService = {
  /**
   * Prepares a query to be handled by the advisor.
   * Currently mocked with deterministic agricultural knowledge for Anand, Gujarat;
   * designed for instant swap to backend/Gemini API in Phase 6.
   */
  async sendQuery(
    queryText: string,
    language: Language,
    context?: AssistantContext
  ): Promise<AssistantMessage> {
    // Simulate natural processing latency
    await new Promise((resolve) => setTimeout(resolve, 450));

    const q = queryText.toLowerCase();

    // Gujarati Responses
    if (language === 'gu') {
      if (q.includes('પિયત') || q.includes('પાણી') || q.includes('irrigate') || q.includes('irrigation')) {
        return {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `ખેડૂત મિત્ર રમેશભાઈ, **આજે પિયત બિલકુલ ન આપો.**\n\n- **મુખ્ય કારણ:** આગામી ૨૪ કલાકમાં ૮૨% વરસાદની શક્યતા છે (~૧૪.૫ મિમી વરસાદ).\n- **ખેતર સ્થિતિ:** ખેતર A માં જમીનનો ભેજ ૩૧% છે, વરસાદથી કુદરતી રીતે ભેજ ૪૮% થઈ જશે.\n- **ભલામણ:** મોટર ચાલુ ન કરશો. વરસાદ પછી આવતીકાલે સાંજે સેન્સર ચેક કરીશું.`,
          contextTag: 'ખેતર A • પિયત સલાહ',
          actionSuggestions: [
            'વરસાદ પછી દવા ક્યારે છાંટવી?',
            'ટામેટાના પાન સુકાઈ ગયા છે તે કાપી નાખવા?',
            'આજે કયા ખેતી કામ પતાવવા?'
          ],
          language: 'gu'
        };
      }

      if (q.includes('ટામેટા') || q.includes('સુકારો') || q.includes('બ્લાઈટ') || q.includes('રોગ') || q.includes('tomato')) {
        return {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `ખેતર A માં **ટામેટાનો આગોતરો સુકારો (Early Blight)** જોવા મળ્યો છે:\n\n1. **પહેલું કામ (આજે સવારે):** નીચેના જે પાંદડા પર ગોળ કાળા-કથ્થઈ ટપકાં છે તેને કાતરથી કાપીને પ્લાસ્ટિકની થેલીમાં ભરી ખેતર બહાર લઈ જાઓ.\n2. **દવા છંટકાવ (વરસાદ પછી):** આજે દવા ન છાંટવી કારણ કે વરસાદથી ધોવાઈ જશે. શુક્રવારે સવારે ટ્રાઈકોડર્મા (Trichoderma) અથવા કોપર હાઇડ્રોક્સાઇડનો છંટકાવ કરવો.\n3. **જમીન ઢાંકવી:** પાળા પર સૂકું ઘાસ કે પરાળ પાથરો જેથી વરસાદનું પાણી ઉડીને પાન પર ન પડે.`,
          contextTag: 'ખેતર A • રોગ નિયંત્રણ',
          actionSuggestions: [
            'દવાનું પ્રમાણ (ડોઝ) કેટલું રાખવું?',
            'શું આ રોગ બીજા છોડમાં ફેલાશે?'
          ],
          language: 'gu'
        };
      }

      return {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `નમસ્તે! પટેલ ફાર્મ માટે આજે મુખ્ય બે સૂચનો છે:\n- ૧. ૮૨% વરસાદ હોવાથી પિયત બંધ રાખવું.\n- ૨. ખેતર A ના ટામેટામાં સુકારાના પાન વરસાદ પહેલાં કાપી લેવા.\n\nતમારો કોઈ ચોક્કસ પ્રશ્ન હોય તો જણાવો.`,
        contextTag: 'પટેલ ફાર્મ • આણંદ',
        actionSuggestions: [
          'શું આજે પિયત આપી શકાય?',
          'ટામેટાના પાન કાપવાની સાચી રીત'
        ],
        language: 'gu'
      };
    }

    // Hindi Responses
    if (language === 'hi') {
      if (q.includes('सिंचाई') || q.includes('पानी') || q.includes('irrigate') || q.includes('irrigation')) {
        return {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `किसान भाई रमेश जी, **आज सिंचाई बिल्कुल न करें।**\n\n- **मौसम:** अगले 24 घंटों में 82% बारिश का अनुमान है (लगभग 14.5 मिमी वर्षा)।\n- **खेत की स्थिति:** खेत A में मिट्टी की नमी अभी 31% है, बारिश से यह स्वतः 48% तक पहुँच जाएगी।\n- **बचत:** आज सिंचाई टालने से लगभग 1,850 लीटर पानी और बिजली की बचत होगी।`,
          contextTag: 'खेत A • सिंचाई परामर्श',
          actionSuggestions: [
            'बारिश के बाद कीटनाशक कब छिड़कें?',
            'टमाटर के पत्तों की छंटाई कैसे करें?'
          ],
          language: 'hi'
        };
      }

      if (q.includes('टमाटर') || q.includes('रोग') || q.includes('ब्लाइट') || q.includes('उपचार') || q.includes('tomato')) {
        return {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `खेत A में **टमाटर का अगेती झुलसा (Early Blight)** पाया गया है:\n\n1. **पहला कदम (तुरंत):** निचले संक्रमित पत्तों को काटकर तुरंत नष्ट करें। इससे बारिश में बीजाणु नहीं फैलेंगे।\n2. **दवा छिड़काव:** आज बारिश की संभावना होने से रासायनिक छिड़काव न करें। शुक्रवार सुबह ट्राइकोडर्मा विरिडी या कॉपर हाइड्रॉक्साइड का छिड़काव करें।\n3. **मल्चिंग:** जड़ों के पास सूखा पुआल बिछाएँ ताकि मिट्टी के छींटे पत्तों पर न पड़ें।`,
          contextTag: 'खेत A • फसल सुरक्षा',
          actionSuggestions: [
            'दवा की खुराक (Dosage) क्या है?',
            'क्या आज सिंचाई कर सकते हैं?'
          ],
          language: 'hi'
        };
      }

      return {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `नमस्ते! पटेल फार्म के लिए मुख्य सलाह:\n- 1. भारी बारिश (82%) के कारण सिंचाई रोकें।\n- 2. खेत A में टमाटर के संक्रमित पत्ते बारिश से पहले हटा दें।\n\nआप किसी विशेष खेत या फसल के बारे में पूछ सकते हैं।`,
        contextTag: 'पटेल फार्म • आणंद',
        actionSuggestions: [
          'क्या आज सिंचाई कर सकते हैं?',
          'टमाटर के रोग का क्या उपचार है?'
        ],
        language: 'hi'
      };
    }

    // English Responses
    if (q.includes('irrigate') || q.includes('water') || q.includes('moisture') || q.includes('pump')) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `**Do not irrigate today.**\n\n- **Weather Trigger:** Rain probability has climbed to 82% with ~14.5 mm rainfall expected over Anand within 24 hours.\n- **Soil Telemetry:** Field A root moisture is currently 31%. Forecasted rainfall will recharge it past the 45% target automatically.\n- **Direct Impact:** Delaying drip lines today preserves 1,850 liters of ground water and avoids waterlogging fungal spores in Field A.`,
        contextTag: 'Field A • Irrigation Advisory',
        actionSuggestions: [
          'When is the next safe spray window?',
          'What are the 3 actions for today?',
          'Explain Early Blight symptoms'
        ],
        language: 'en'
      };
    }

    if (q.includes('early blight') || q.includes('tomato') || q.includes('disease') || q.includes('pathogen') || q.includes('treat')) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `**Tomato Early Blight Protocol (Alternaria solani):**\n\n1. **Sanitation (Immediate):** Manually clip lower leaves showing target-like concentric rings before expected afternoon rain. Bag debris and remove off-field.\n2. **Hold Chemical Sprays:** Rain will wash off surface sprays today. Wait for the dry window starting Friday morning.\n3. **Application:** Foliar application of Copper Hydroxide (2g/L) or Trichoderma viride (10g/L) once foliage dries.\n4. **Mulch:** Spread straw mulch beneath vines to prevent rain splash dispersal.`,
        contextTag: 'Field A • Crop Protection',
        actionSuggestions: [
          'Can I irrigate Field A today?',
          'Explain why sprays should be delayed',
          'How is sustainability score affected?'
        ],
        language: 'en'
      };
    }

    if (q.includes('action') || q.includes('today') || q.includes('priority')) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `**Priority Action Summary for Patel Farm:**\n\n- **Urgent (10:00 AM):** Delay scheduled irrigation pumps for Field A & Field C (rain incoming).\n- **Urgent (11:30 AM):** Prune Early Blight lower foliage in Field A before rain starts.\n- **Recommended:** Hold chemical spraying until Friday clear window.\n- **Completed:** Soil moisture sensor C-2 check verified at 26%.`,
        contextTag: 'Operational Schedule',
        actionSuggestions: [
          'Can I irrigate Field A today?',
          'What is the rain timing?'
        ],
        language: 'en'
      };
    }

    // Default intelligent fallback
    return {
      id: `bot-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Based on Patel Farm's active sensors in Anand, Gujarat:\n\n- **Field A (Tomato):** Early Blight detected (Moderate severity, 91% confidence). Lower leaf pruning advised before rain.\n- **Weather:** 82% rain probability today (~14.5 mm). Spray window is unfavorable until Friday.\n- **Irrigation:** Delay pumps on Field A and Field C.\n\nHow can I help you proceed with field operations?`,
      contextTag: 'Patel Farm Overview',
      actionSuggestions: [
        'Can I irrigate Field A today?',
        'What should I do about Tomato Early Blight?',
        'Show today’s high priority tasks'
      ],
      language: 'en'
    };
  }
};
