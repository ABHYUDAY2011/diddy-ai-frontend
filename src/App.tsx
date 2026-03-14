import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  Plus, 
  User,
  ChevronDown,
  Mic,
  AudioLines,
  PanelLeft,
  SquarePen,
  Sparkles,
  Lock,
  ArrowUpRight,
  Paperclip,
  X,
  Check,
  Monitor,
  Tablet,
  Smartphone,
  Copy,
  Download,
  Maximize2,
  Minimize2
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import netlifyIdentity from "netlify-identity-widget";
import { GoogleGenAI, Modality } from "@google/genai";
import { LiveProvider, LiveEditor, LiveError, LivePreview } from "react-live";

// Gemini Setup
const SYSTEM_INSTRUCTION = "You are Diddy. Your persona is a high-end elite with a 'sus' slang, lots of emojis, and a massive attitude. You talk about 'empire moves', 'inner circles', and 'tapped in'. If the user asks for code, provide it in clean markdown blocks. Always maintain the persona, even when explaining technical things. Use words like 'fam', 'no cap', 'vibes', and 'elite'.";

interface Message {
  role: 'user' | 'ai';
  content: string;
  image?: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const AI_PFP = "https://imgcdn.stablediffusionweb.com/2024/10/30/46f5e9b3-207c-4474-8e2b-8c9dceca64f2.jpg";

interface SidebarItemProps {
  title: string;
  active?: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ title, active, onClick }) => (
  <div 
    onClick={onClick}
    className={`px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group ${active ? 'bg-[#2f2f2f]' : 'hover:bg-[#2f2f2f]'}`}
  >
    <span className={`text-[14px] truncate block ${active ? 'text-white font-medium' : 'text-[#ececec]'}`}>{title}</span>
  </div>
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [promptCount, setPromptCount] = useState(0);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [canvasCode, setCanvasCode] = useState<string>("");
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const [dailyUploads, setDailyUploads] = useState<{ date: string; count: number }>({ date: "", count: 0 });
  const [tempTranscript, setTempTranscript] = useState("");
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const PROMPT_LIMIT = 3;
  const UPLOAD_LIMIT = 5;

  // Load from localStorage
  useEffect(() => {
    const savedChats = localStorage.getItem('diddy_chats');
    if (savedChats) {
      const parsed = JSON.parse(savedChats);
      setChats(parsed);
      if (parsed.length > 0) {
        setCurrentChatId(parsed[0].id);
      }
    } else {
      startNewChat();
    }

    const savedUploads = localStorage.getItem('diddy_uploads');
    const today = new Date().toDateString();
    if (savedUploads) {
      const parsed = JSON.parse(savedUploads);
      if (parsed.date === today) {
        setDailyUploads(parsed);
      } else {
        const reset = { date: today, count: 0 };
        setDailyUploads(reset);
        localStorage.setItem('diddy_uploads', JSON.stringify(reset));
      }
    } else {
      const init = { date: today, count: 0 };
      setDailyUploads(init);
      localStorage.setItem('diddy_uploads', JSON.stringify(init));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('diddy_chats', JSON.stringify(chats));
    }
  }, [chats]);

  const currentChat = chats.find(c => c.id === currentChatId) || null;
  const messages = currentChat?.messages || [];

  const startNewChat = () => {
    const newChat: Chat = {
      id: Math.random().toString(36).substring(7),
      title: "New Empire Move...",
      messages: [],
      createdAt: Date.now()
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setIsCanvasOpen(false);
    setCanvasCode("");
  };

  const updateChatMessages = (chatId: string, newMessages: Message[]) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: newMessages } : c));
  };

  const generateChatTitle = async (firstMessage: string, chatId: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ text: `Generate a 3-to-4 word 'sus' and luxury-themed title for this message: "${firstMessage}". Example: 'React Empire Architect'. Return ONLY the title text, no quotes or emojis.` }],
      });
      const newTitle = result.text?.trim() || "Elite Session";
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: newTitle } : c));
    } catch (error) {
      console.error("Title generation failed", error);
    }
  };

  const handleManualRename = () => {
    if (!currentChat) return;
    if (editingTitleValue.trim()) {
      setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, title: editingTitleValue.trim() } : c));
    }
    setIsEditingTitle(false);
  };

  useEffect(() => {
    netlifyIdentity.init();
    const currentUser = netlifyIdentity.currentUser();
    if (currentUser) setUser(currentUser);

    netlifyIdentity.on("login", (user) => {
      setUser(user);
      netlifyIdentity.close();
    });

    netlifyIdentity.on("logout", () => {
      setUser(null);
      setPromptCount(0);
    });
  }, []);

  const handleLogin = () => netlifyIdentity.open();
  const handleLogout = () => netlifyIdentity.logout();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const extractCode = (text: string) => {
    const match = text.match(/```(?:jsx|tsx|html|javascript|js)?\n([\s\S]*?)```/);
    return match ? match[1] : null;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const today = new Date().toDateString();
    if (dailyUploads.count >= UPLOAD_LIMIT && dailyUploads.date === today) {
      alert("Daily limit reached, fam. 5 files max. Keep it elite.");
      return;
    }

    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startVoiceRecognition = () => {
    if (isRecording) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition not supported in this browser, fam. No cap.");
      return;
    }

    console.log("Attempting to start voice recognition...");
    setIsRecording(true);
    setTempTranscript("");

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      console.log("Voice recognition successfully started");
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        alert("Mic access denied, fam. Enable it in your settings to stay tapped in.");
      } else {
        alert(`Voice error: ${event.error}. Check your vibes.`);
      }
    };
    
    recognition.onend = () => {
      // Don't set isRecording to false here, let the user do it with tick/x
    };
    
    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        setTempTranscript(prev => prev + finalTranscript);
        setInput(prev => (prev ? prev + " " : "") + finalTranscript);
      } else if (interimTranscript) {
        // Show interim transcript in the recording bar for immediate feedback
        setTempTranscript(interimTranscript);
      }
    };
    
    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Failed to start recognition", err);
      setIsRecording(false);
    }
  };

  const handleVoiceConfirm = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setTempTranscript("");
  };

  const handleVoiceCancel = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setTempTranscript("");
  };

  const generateTTS = (text: string) => {
    if (!isTtsEnabled) return;
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Male') || v.lang.startsWith('en')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = setVoice;
      } else {
        setVoice();
      }
    } catch (error) {
      console.error("TTS failed", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !attachedImage) return;
    if (isTyping || !currentChatId) return;

    if (!user && promptCount >= PROMPT_LIMIT) {
      handleLogin();
      return;
    }

    const userMessage: Message = { 
      role: 'user', 
      content: input, 
      image: attachedImage || undefined 
    };
    
    const newMessages = [...messages, userMessage];
    updateChatMessages(currentChatId, newMessages);

    const currentInput = input;
    const currentImage = attachedImage;
    const currentChatIdAtSend = currentChatId;
    
    setInput('');
    setAttachedImage(null);
    setIsTyping(true);
    setPromptCount(prev => prev + 1);

    // Update daily uploads if image was sent
    if (currentImage) {
      const newUploads = { ...dailyUploads, count: dailyUploads.count + 1 };
      setDailyUploads(newUploads);
      localStorage.setItem('diddy_uploads', JSON.stringify(newUploads));
    }

    // Auto-rename if first message
    if (messages.length === 0) {
      generateChatTitle(currentInput || "Image Analysis", currentChatIdAtSend);
    }

    try {
      let aiResponse = "";

      if (currentImage) {
        // Gemini Multimodal Path
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const base64Data = currentImage.split(',')[1];
        const result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            { text: currentInput || "Analyze this for elite opportunities, fam." },
            {
              inlineData: {
                data: base64Data,
                mimeType: "image/jpeg"
              }
            }
          ],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION
          }
        });
        aiResponse = result.text || "I'm tapped in, fam.";
      } else {
        // Hugging Face Text Path
        const response = await fetch(import.meta.env.VITE_HF_CHAT_URL || 'https://your-hf-space-url/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_input: currentInput }),
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        aiResponse = typeof data === 'string' ? data : data.response || data.output || "I'm tapped in, fam.";
      }

      const finalMessages = [...newMessages, { role: 'ai', content: aiResponse } as Message];
      updateChatMessages(currentChatIdAtSend, finalMessages);
      
      // Automatic TTS
      generateTTS(aiResponse);

      const code = extractCode(aiResponse);
      if (code) {
        setCanvasCode(code);
        setIsCanvasOpen(true);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessages = [...newMessages, { role: 'ai', content: "Connection interrupted. The vault is locked, fam. Try again." } as Message];
      updateChatMessages(currentChatIdAtSend, errorMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(canvasCode);
    alert("Code copied to the clipboard, fam. No cap.");
  };

  const downloadProject = () => {
    const blob = new Blob([canvasCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diddy-empire-project.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Guest';
  const userPfp = user?.user_metadata?.avatar_url || null;

  return (
    <div className="h-screen w-full bg-[#212121] flex overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-[#171717] flex flex-col border-r border-white/5 shrink-0"
          >
            <div className="p-3 flex items-center justify-between">
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-[#2f2f2f] rounded-lg text-[#b4b4b4] transition-colors"
              >
                <PanelLeft size={20} />
              </button>
              <button 
                onClick={startNewChat}
                className="p-2 hover:bg-[#2f2f2f] rounded-lg text-[#b4b4b4] transition-colors"
              >
                <SquarePen size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
              <div className="mb-4 px-3">
                <span className="text-[12px] font-bold text-[#676767] uppercase tracking-wider">Empire History</span>
              </div>
              <div className="space-y-0.5">
                {chats.map(chat => (
                  <SidebarItem 
                    key={chat.id} 
                    title={chat.title} 
                    active={chat.id === currentChatId}
                    onClick={() => setCurrentChatId(chat.id)}
                  />
                ))}
              </div>
            </div>

            <div className="p-3 mt-auto">
              {user ? (
                <div className="p-3 rounded-lg hover:bg-[#2f2f2f] cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    {userPfp ? (
                      <img src={userPfp} alt="User" className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#00a67e] flex items-center justify-center text-white text-xs font-bold">
                        {firstName[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[14px] text-white font-medium truncate max-w-[120px]">
                        {firstName.toUpperCase()}
                      </span>
                      <span className="text-[12px] text-[#b4b4b4]">Elite Tier</span>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-red-400">
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={handleLogin} className="w-full py-2 bg-white text-black rounded-lg font-bold text-sm">
                  Log In
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-row relative overflow-hidden">
        <div className={`flex-1 flex flex-col transition-all duration-500 ${isCanvasOpen ? 'w-1/2' : 'w-full'}`}>
          {/* Top Bar */}
          <header className="h-[60px] px-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              {!sidebarOpen && (
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-[#2f2f2f] rounded-lg text-[#b4b4b4] transition-colors mr-2"
                >
                  <PanelLeft size={20} />
                </button>
              )}
              <div 
                onClick={() => {
                  if (!isEditingTitle) {
                    setIsEditingTitle(true);
                    setEditingTitleValue(currentChat?.title || "DIDDY.AI");
                  }
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-[#2f2f2f] text-white font-semibold transition-colors group cursor-pointer"
              >
                {isEditingTitle ? (
                  <input
                    autoFocus
                    value={editingTitleValue}
                    onChange={(e) => setEditingTitleValue(e.target.value)}
                    onBlur={handleManualRename}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualRename()}
                    className="bg-transparent border-none outline-none text-white w-40"
                  />
                ) : (
                  <>
                    <span className="truncate max-w-[150px]">{currentChat?.title || "DIDDY.AI"}</span>
                    <SquarePen 
                      size={14} 
                      className="text-[#676767] opacity-0 group-hover:opacity-100 transition-opacity ml-1" 
                    />
                  </>
                )}
                <ChevronDown size={16} className="text-[#676767]" />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded-full text-[13px] font-medium text-white transition-all">
                <Sparkles size={14} className="text-[#ab68ff]" />
                Get Plus
              </button>
              <button className="p-2 hover:bg-[#2f2f2f] rounded-full text-[#b4b4b4] transition-colors">
                <User size={20} />
              </button>
            </div>
          </header>

          {/* Chat Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center px-4">
                <h1 className="text-4xl font-semibold text-white mb-12 text-center">
                  Hey, {firstName.toUpperCase()}. Ready to dive in?
                </h1>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-4 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10 ${
                      msg.role === 'user' ? 'bg-[#00a67e]' : 'bg-black'
                    }`}>
                      {msg.role === 'user' ? (
                        userPfp ? <img src={userPfp} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : firstName[0].toUpperCase()
                      ) : (
                        <img src={AI_PFP} alt="Diddy" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    <div className={`flex-1 space-y-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      <p className="font-bold text-[14px] text-white">
                        {msg.role === 'user' ? 'You' : 'DIDDY.AI'}
                      </p>
                      <div className={`text-[16px] text-[#ececec] leading-relaxed whitespace-pre-wrap inline-block text-left p-4 rounded-2xl ${
                        msg.role === 'user' ? 'bg-[#2f2f2f]' : ''
                      }`}>
                        {msg.image && (
                          <img src={msg.image} alt="Attached" className="max-w-xs rounded-lg mb-3 border border-white/10" referrerPolicy="no-referrer" />
                        )}
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center overflow-hidden border border-white/10">
                      <img src={AI_PFP} alt="Diddy" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="font-bold text-[14px] text-white">DIDDY.AI</p>
                      <div className="flex items-center gap-1 py-4 px-4 bg-white/5 rounded-2xl">
                        <span className="text-xs text-slate-400 mr-2 scanning-animation px-2 py-1 rounded">Scanning for Elite Opportunities...</span>
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-[#ececec] rounded-full" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#ececec] rounded-full" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#ececec] rounded-full" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="w-full max-w-3xl mx-auto px-4 pb-8">
            {attachedImage && (
              <div className="mb-3 relative inline-block">
                <img src={attachedImage} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-white/20 shadow-xl" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-2 -right-2 bg-black/80 text-white rounded-full p-1 border border-white/20 hover:bg-white hover:text-black transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div 
                  key="voice-ui"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="relative bg-[#2f2f2f] rounded-[26px] p-2 flex items-center gap-4 shadow-xl border border-white/5 h-[58px]"
                >
                  <div className="flex-1 flex items-center justify-center gap-1 h-full px-4 overflow-hidden">
                    {tempTranscript ? (
                      <p className="text-white text-sm truncate">{tempTranscript}</p>
                    ) : (
                      [...Array(20)].map((_, i) => (
                        <div 
                          key={i} 
                          className="waveform-bar" 
                          style={{ animationDelay: `${i * 0.05}s` }}
                        />
                      ))
                    )}
                  </div>
                  <div className="flex items-center gap-2 pr-2">
                    <button 
                      onClick={handleVoiceCancel}
                      className="p-2.5 hover:bg-white/5 rounded-full text-[#b4b4b4] transition-colors"
                    >
                      <X size={20} />
                    </button>
                    <button 
                      onClick={handleVoiceConfirm}
                      className="p-2.5 bg-white text-black rounded-full transition-all hover:bg-slate-200"
                    >
                      <Check size={20} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="input-ui"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="relative bg-[#2f2f2f] rounded-[26px] p-2 flex items-center gap-2 shadow-xl border border-white/5"
                >
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 hover:bg-[#3c3c3c] rounded-full text-[#b4b4b4] transition-colors"
                  >
                    <Paperclip size={20} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Tapped In..."
                    className="flex-1 bg-transparent border-none outline-none px-2 py-3 text-[16px] text-white placeholder:text-[#9b9b9b]"
                  />
                  <div className="flex items-center gap-1 pr-2">
                    <button 
                      onClick={startVoiceRecognition}
                      className="p-2.5 hover:bg-[#3c3c3c] rounded-full text-[#b4b4b4] transition-colors"
                    >
                      <Mic size={20} />
                    </button>
                    <button 
                      onClick={handleSend}
                      disabled={(!input.trim() && !attachedImage) || isTyping}
                      className={`p-2.5 rounded-full transition-all ${
                        (input.trim() || attachedImage) && !isTyping 
                          ? 'bg-white text-black' 
                          : 'text-[#676767]'
                      }`}
                    >
                      {(input.trim() || attachedImage) ? <Send size={20} /> : <AudioLines size={20} />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <p className="text-center text-[12px] text-[#676767] mt-3">
              DIDDY.AI can make mistakes. Check important info, fam.
            </p>
          </div>
        </div>

        {/* Live Canvas */}
        <AnimatePresence>
          {isCanvasOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-1/2 h-full bg-[#171717] border-l border-white/10 flex flex-col z-20"
            >
              <header className="h-[60px] px-6 flex items-center justify-between border-b border-white/10 luxury-glass">
                <div className="flex items-center gap-4">
                  <div className="flex bg-white/5 rounded-lg p-1">
                    <button 
                      onClick={() => setViewMode('desktop')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                    >
                      <Monitor size={16} />
                    </button>
                    <button 
                      onClick={() => setViewMode('tablet')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'tablet' ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                    >
                      <Tablet size={16} />
                    </button>
                    <button 
                      onClick={() => setViewMode('mobile')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                    >
                      <Smartphone size={16} />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Elite Preview</span>
                </div>
                <button 
                  onClick={() => setIsCanvasOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-slate-400"
                >
                  <Minimize2 size={20} />
                </button>
              </header>

              <div className="flex-1 flex flex-col overflow-hidden">
                <LiveProvider code={canvasCode} noInline={false}>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="h-1/3 border-b border-white/10 overflow-hidden relative group">
                      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] bg-black/50 text-white px-2 py-1 rounded uppercase tracking-tighter">Editor</span>
                      </div>
                      <LiveEditor className="h-full font-mono text-sm custom-scrollbar" />
                    </div>
                    <div className="flex-1 bg-white overflow-hidden flex items-center justify-center p-8">
                      <div className={`h-full bg-white shadow-2xl transition-all duration-500 overflow-auto ${
                        viewMode === 'desktop' ? 'w-full' : 
                        viewMode === 'tablet' ? 'w-[768px]' : 'w-[375px]'
                      }`}>
                        <LivePreview className="h-full w-full" />
                      </div>
                    </div>
                  </div>
                  <LiveError className="p-4 bg-red-500/10 text-red-400 text-xs font-mono" />
                </LiveProvider>
              </div>

              <footer className="p-4 border-t border-white/10 flex items-center justify-between luxury-glass">
                <div className="flex gap-2">
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white transition-all"
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                  <button 
                    onClick={downloadProject}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white transition-all"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
                <button className="p-2 bg-white text-black rounded-lg hover:bg-slate-200 transition-all">
                  <Maximize2 size={16} />
                </button>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Axur Icon (Minimized Canvas) */}
        {!isCanvasOpen && canvasCode && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setIsCanvasOpen(true)}
            className="absolute bottom-32 right-8 w-14 h-14 bg-black rounded-full flex items-center justify-center border border-white/20 axur-glow z-30 group"
          >
            <Sparkles className="text-white w-6 h-6 group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
            </div>
          </motion.button>
        )}
      </main>
    </div>
  );
}
