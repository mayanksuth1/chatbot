import React, { useState, useEffect, useRef } from 'react';
import { Menu, ChevronDown, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { AppState, Message, Role, ModelId, ChatSession, Attachment } from './types';
import { DEFAULT_MODEL, MODEL_LABELS, WELCOME_SUGGESTIONS, MODEL_DESCRIPTIONS } from './constants';
import { generateResponseStream } from './services/geminiService';

import Sidebar from './components/Sidebar';
import InputArea from './components/InputArea';
import MarkdownRenderer from './components/MarkdownRenderer';

function App() {
  // --- State ---
  const [state, setState] = useState<AppState>({
    user: null,
    currentSessionId: null,
    sessions: {},
    selectedModel: DEFAULT_MODEL,
    sidebarOpen: false
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);

  // Onboarding form state
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingEmail, setOnboardingEmail] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.sessions, state.currentSessionId, isGenerating]);

  // Initialize first session if empty and user is set
  useEffect(() => {
    if (state.user && !state.currentSessionId) {
       createNewSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user]);

  // --- Helpers ---
  const currentSession = state.currentSessionId ? state.sessions[state.currentSessionId] : null;
  const currentMessages = currentSession?.messages || [];

  const createNewSession = () => {
    const newId = uuidv4();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now()
    };
    
    setState(prev => ({
      ...prev,
      currentSessionId: newId,
      sessions: { ...prev.sessions, [newId]: newSession },
      sidebarOpen: false // close sidebar on mobile when new chat starts
    }));
  };

  const updateCurrentSession = (updater: (session: ChatSession) => ChatSession) => {
    if (!state.currentSessionId) return;
    setState(prev => {
      const session = prev.sessions[state.currentSessionId!];
      if (!session) return prev;
      const updatedSession = updater({ ...session });
      return {
        ...prev,
        sessions: { ...prev.sessions, [session.id]: updatedSession }
      };
    });
  };

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onboardingName.trim() && onboardingEmail.trim()) {
      setState(prev => ({
        ...prev,
        user: {
          firstName: onboardingName.trim(),
          email: onboardingEmail.trim()
        }
      }));
    }
  };

  // --- Handlers ---

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    if (!state.currentSessionId) return;
    setError(null);
    setIsGenerating(true);

    const userMsgId = uuidv4();
    const userMessage: Message = {
      id: userMsgId,
      role: Role.USER,
      text: text,
      attachments: attachments,
      timestamp: Date.now()
    };

    // 1. Add User Message
    updateCurrentSession(session => {
      // Update title if it's the first message
      let newTitle = session.title;
      if (session.messages.length === 0) {
        newTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
      }
      return {
        ...session,
        title: newTitle,
        messages: [...session.messages, userMessage],
        updatedAt: Date.now()
      };
    });

    // 2. Add Placeholder Assistant Message
    const aiMsgId = uuidv4();
    const aiPlaceholder: Message = {
      id: aiMsgId,
      role: Role.MODEL,
      text: '',
      timestamp: Date.now(),
      isStreaming: true
    };

    updateCurrentSession(session => ({
      ...session,
      messages: [...session.messages, aiPlaceholder]
    }));

    // 3. Call API
    // We pass the history excluding the placeholder we just added
    const history = currentSession ? [...currentSession.messages, userMessage] : [userMessage];

    await generateResponseStream(
      state.selectedModel,
      history,
      text,
      attachments,
      (chunkText) => {
        // On Chunk
        updateCurrentSession(session => {
          const msgs = [...session.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg.id === aiMsgId) {
            lastMsg.text += chunkText;
          }
          return { ...session, messages: msgs };
        });
      },
      () => {
        // On Complete
        setIsGenerating(false);
        updateCurrentSession(session => {
           const msgs = [...session.messages];
           const lastMsg = msgs[msgs.length - 1];
           lastMsg.isStreaming = false;
           return { ...session, messages: msgs };
        });
      },
      (err) => {
        // On Error
        setIsGenerating(false);
        setError(err.message || "Something went wrong");
        updateCurrentSession(session => {
           const msgs = [...session.messages];
           const lastMsg = msgs[msgs.length - 1];
           lastMsg.isStreaming = false;
           lastMsg.text = lastMsg.text || "Sorry, I encountered an error processing your request.";
           return { ...session, messages: msgs };
        });
      }
    );
  };

  if (!state.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1120] p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-[#1F2937] rounded-full flex items-center justify-center mb-4 border border-[#374151]">
               <Sparkles size={32} className="text-[#0EA5E9]" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome to Astra AI</h1>
            <p className="text-[#94A3B8]">Experience world-class AI performance.</p>
          </div>
          
          <form onSubmit={handleOnboardingSubmit} className="bg-[#1F2937] p-8 rounded-2xl border border-[#374151] shadow-xl">
             <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#E2E8F0] mb-2">First Name</label>
                  <input 
                    id="name"
                    type="text" 
                    required
                    value={onboardingName}
                    onChange={(e) => setOnboardingName(e.target.value)}
                    className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent outline-none transition-all placeholder-[#64748B]"
                    placeholder="Enter your first name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#E2E8F0] mb-2">Email Address</label>
                  <input 
                    id="email"
                    type="email" 
                    required
                    value={onboardingEmail}
                    onChange={(e) => setOnboardingEmail(e.target.value)}
                    className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent outline-none transition-all placeholder-[#64748B]"
                    placeholder="Enter your email"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#0EA5E9]/20"
                >
                  <span>Start Exploring</span>
                  <ArrowRight size={18} />
                </button>
             </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0B1120] text-[#E2E8F0] overflow-hidden selection:bg-[#0EA5E9]/30">
      
      <Sidebar 
        sessions={state.sessions}
        currentSessionId={state.currentSessionId}
        isOpen={state.sidebarOpen}
        onToggle={() => setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }))}
        onSelectSession={(id) => setState(prev => ({ ...prev, currentSessionId: id }))}
        onNewChat={createNewSession}
      />

      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-[#1F2937] bg-[#0B1120]/80 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }))}
              className="p-2 hover:bg-[#1F2937] rounded-lg md:hidden text-[#94A3B8]"
            >
              <Menu size={20} />
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#1F2937] rounded-lg transition-colors text-sm font-medium text-[#E2E8F0] group"
              >
                <span className="text-[#0EA5E9]"><Sparkles size={16} fill="currentColor" /></span>
                <span>{MODEL_LABELS[state.selectedModel]}</span>
                <ChevronDown size={14} className="text-[#94A3B8] group-hover:text-[#E2E8F0] transition-colors" />
              </button>

              {/* Model Dropdown */}
              {showModelMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowModelMenu(false)} />
                  <div className="absolute top-full left-0 mt-2 w-72 bg-[#1F2937] border border-[#374151] rounded-xl shadow-xl z-20 overflow-hidden p-1">
                     {Object.entries(MODEL_LABELS).map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => {
                            setState(prev => ({ ...prev, selectedModel: id as ModelId }));
                            setShowModelMenu(false);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-lg flex flex-col gap-1 transition-colors ${state.selectedModel === id ? 'bg-[#374151]' : 'hover:bg-[#374151]/50'}`}
                        >
                           <div className="flex items-center justify-between">
                             <span className={`text-sm font-medium ${state.selectedModel === id ? 'text-[#0EA5E9]' : 'text-[#E2E8F0]'}`}>{label}</span>
                             {state.selectedModel === id && <div className="w-2 h-2 rounded-full bg-[#0EA5E9]" />}
                           </div>
                           <span className="text-xs text-[#94A3B8]">{MODEL_DESCRIPTIONS[id as ModelId]}</span>
                        </button>
                     ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="text-sm font-medium text-[#94A3B8] hidden md:block">
             Welcome, <span className="text-[#E2E8F0]">{state.user.firstName}</span>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
          
          {/* Empty State / Welcome */}
          {currentMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center p-8 max-w-4xl mx-auto animate-fade-in">
               <div className="mb-8 relative">
                 <div className="absolute -inset-1 bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] rounded-full blur opacity-20"></div>
                 <div className="relative bg-[#1F2937] p-5 rounded-full shadow-2xl border border-[#374151]">
                    <Sparkles size={48} className="text-[#0EA5E9]" />
                 </div>
               </div>
               <h1 className="text-4xl font-display font-bold text-white mb-2 text-center tracking-tight">
                 Hello, {state.user.firstName}.
               </h1>
               <p className="text-[#94A3B8] text-lg mb-12 text-center">How can I help you today?</p>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                 {WELCOME_SUGGESTIONS.map((sugg, idx) => (
                   <button 
                    key={idx}
                    onClick={() => handleSendMessage(sugg.prompt, [])}
                    className="bg-[#1F2937] hover:bg-[#374151] border border-[#374151] hover:border-[#0EA5E9]/50 p-4 rounded-xl text-left transition-all group shadow-sm hover:shadow-md"
                   >
                     <span className="text-sm font-medium text-[#94A3B8] group-hover:text-[#0EA5E9] transition-colors">{sugg.text}</span>
                   </button>
                 ))}
               </div>
            </div>
          )}

          {/* Messages List */}
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
            {currentMessages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                
                {/* Avatar (AI) */}
                {msg.role === Role.MODEL && (
                  <div className="w-8 h-8 rounded-full bg-[#1F2937] border border-[#374151] flex-shrink-0 flex items-center justify-center mt-1 shadow-sm">
                    <Sparkles size={14} className="text-[#0EA5E9]" />
                  </div>
                )}

                {/* Message Body */}
                <div className={`max-w-[85%] md:max-w-[75%] space-y-2`}>
                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                     <div className="flex flex-wrap gap-2 mb-2 justify-end">
                        {msg.attachments.map((att, idx) => (
                          <img key={idx} src={att.url} alt="User upload" className="w-32 h-32 object-cover rounded-xl border border-[#374151] shadow-sm" />
                        ))}
                     </div>
                  )}
                  
                  {/* Text Bubble */}
                  <div className={`p-4 rounded-2xl ${
                    msg.role === Role.USER 
                      ? 'bg-[#0EA5E9] text-white shadow-md rounded-tr-sm' 
                      : 'bg-[#1F2937] border border-[#374151] shadow-sm text-[#E2E8F0] rounded-tl-sm'
                  }`}>
                    {msg.role === Role.USER ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    ) : (
                      <>
                        {msg.text ? (
                           <MarkdownRenderer content={msg.text} />
                        ) : msg.isStreaming ? (
                           <div className="flex gap-1 items-center h-6">
                             <span className="w-2 h-2 bg-[#0EA5E9] rounded-full typing-dot"></span>
                             <span className="w-2 h-2 bg-[#0EA5E9] rounded-full typing-dot"></span>
                             <span className="w-2 h-2 bg-[#0EA5E9] rounded-full typing-dot"></span>
                           </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
           <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-red-900/50 border border-red-800 text-red-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm shadow-lg backdrop-blur-sm">
             <AlertCircle size={16} />
             {error}
           </div>
        )}

        {/* Input Area */}
        <div className="flex-shrink-0 bg-[#0B1120] pt-4">
          <InputArea onSend={handleSendMessage} disabled={isGenerating} />
        </div>

      </main>
    </div>
  );
}

export default App;