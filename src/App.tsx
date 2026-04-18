import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, PenTool, Sparkles, Languages, Check, ArrowRight, LayoutTemplate, MessageSquareText, Lightbulb, Loader2, Copy, FileText, Upload, X, Download, BookOpen, BookText, History, Trash2, ChevronRight, DownloadCloud } from 'lucide-react';
import Markdown from 'react-markdown';
import html2canvas from 'html2canvas-pro';

export interface GeneratedHistoryItem {
  id: string;
  type: string;
  title: string;
  content: string;
  timestamp: number;
}
import { jsPDF } from 'jspdf';
import { checkGrammar, rewriteText, translateText, generateArticle, brainstormIdeas, summarizePdf, summarizeBook, generateFullBook } from './services/geminiService';

const LANGUAGES = [
  'English', 'Bengali', 'Spanish', 'French', 'German', 'Hindi', 
  'Arabic', 'Chinese', 'Japanese', 'Russian', 'Portuguese', 
  'Italian', 'Korean', 'Turkish', 'Dutch', 'Indonesian'
];

const MavxonLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M 22 75 V 35 L 50 63 L 78 35 V 75" stroke="url(#m-grad)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="22" cy="20" r="6" fill="#F59E0B" />
    <circle cx="78" cy="20" r="6" fill="#3B82F6" />
    <defs>
      <linearGradient id="m-grad" x1="22" y1="20" x2="78" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
  </svg>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'generator' | 'pdf' | 'books'>('editor');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const pdfSummaryRef = useRef<HTMLDivElement>(null);
  const generatorPdfRef = useRef<HTMLDivElement>(null);
  const historyPdfRef = useRef<HTMLDivElement>(null);

  const [history, setHistory] = useState<GeneratedHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<GeneratedHistoryItem | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mavxonHistory');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch(e) {
      console.error('Failed to load history', e);
    }
  }, []);

  const saveToHistory = (item: Pick<GeneratedHistoryItem, 'type' | 'title' | 'content'>) => {
    if(!item.content.trim()) return;
    const newItem: GeneratedHistoryItem = {
      id: Date.now().toString(),
      ...item,
      timestamp: Date.now()
    };
    setHistory(prev => {
      const newHistory = [newItem, ...prev].slice(0, 50); // Keep last 50 items
      try {
        localStorage.setItem('mavxonHistory', JSON.stringify(newHistory));
      } catch(e) {
        console.error('Failed to save object to history (maybe quota exceeded)', e);
      }
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('mavxonHistory');
    setSelectedHistory(null);
  };

  const handleDownloadPDF = async (elementRef: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!elementRef.current) return;
    const element = elementRef.current;
    
    // Temporarily make it visible to html2canvas without breaking page layout
    const originalLeft = element.style.left;
    const originalTop = element.style.top;
    element.style.left = '0';
    element.style.top = '0';

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 16; 
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const scaledHeight = (imgHeight * pdfWidth) / imgWidth;
      
      let heightLeft = scaledHeight;
      let position = margin;
      
      const addHeaderFooter = () => {
        // Cover top margin with white box
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, margin, 'F');
        // Cover bottom margin with white box
        pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');
        
        // Add Header
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text("Mavxon AI", pdfWidth / 2, 10, { align: "center" });

        // Add Footer
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text("Developed by Bijoy Mahmud Munna", pdfWidth / 2, pdfHeight - 6, { align: "center" });
      };

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
      addHeaderFooter();
      heightLeft -= (pdfHeight - 2 * margin);
      
      while (heightLeft > 0) {
        position -= (pdfHeight - 2 * margin);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
        addHeaderFooter();
        heightLeft -= (pdfHeight - 2 * margin);
      }
      
      pdf.save(filename);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    } finally {
      // Restore hidden positioning
      element.style.left = originalLeft || '-9999px';
      element.style.top = originalTop || '-9999px';
    }
  };
  
  // Editor State
  const [editorInput, setEditorInput] = useState('');
  const [editorResult, setEditorResult] = useState('');
  const [isEditorLoading, setIsEditorLoading] = useState(false);

  // Generator State
  const [topicInput, setTopicInput] = useState('');
  const [generatorResult, setGeneratorResult] = useState('');
  const [isGeneratorLoading, setIsGeneratorLoading] = useState(false);
  
  // PDF State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfResult, setPdfResult] = useState('');
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadLogoAsPNG = () => {
    const svgString = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      <path d="M 22 75 V 35 L 50 63 L 78 35 V 75" stroke="url(#m-grad)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="22" cy="20" r="6" fill="#F59E0B" />
      <circle cx="78" cy="20" r="6" fill="#3B82F6" />
      <defs>
        <linearGradient id="m-grad" x1="22" y1="20" x2="78" y2="80" gradientUnits="userSpaceOnUse">
          <stop stop-color="#F59E0B" />
          <stop offset="1" stop-color="#3B82F6" />
        </linearGradient>
      </defs>
    </svg>`;
    
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = 'Mavxon-Logo-HighRes.png';
        a.click();
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const getErrorMessage = (e: any) => {
    const msg = String(e.message || e);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      return "You exceeded your daily quota";
    }
    return msg;
  };

  const handleEditorAction = async (action: 'grammar' | 'rewrite' | 'translate') => {
    if (!editorInput.trim()) return;
    setIsEditorLoading(true);
    setEditorResult('');
    
    try {
      let res = '';
      switch (action) {
        case 'grammar':
          res = await checkGrammar(editorInput);
          break;
        case 'rewrite':
          res = await rewriteText(editorInput);
          break;
        case 'translate':
          res = await translateText(editorInput, targetLanguage);
          break;
      }
      setEditorResult(res);
      saveToHistory({ 
        type: action === 'grammar' ? 'Grammar Fix' : action === 'rewrite' ? 'Rewrite' : 'Translation', 
        title: editorInput.substring(0, 40) + '...', 
        content: res 
      });
    } catch (e: any) {
      setEditorResult(`**Error:** ${getErrorMessage(e)}`);
    } finally {
      setIsEditorLoading(false);
    }
  };

  const handleGeneratorAction = async (action: 'article' | 'ideas' | 'bookSummary' | 'fullBook') => {
    if (!topicInput.trim()) return;
    setIsGeneratorLoading(true);
    setGeneratorResult('');
    
    try {
      let res = '';
      switch (action) {
        case 'article':
          res = await generateArticle(topicInput, targetLanguage);
          break;
        case 'ideas':
          res = await brainstormIdeas(topicInput);
          break;
        case 'bookSummary':
          res = await summarizeBook(topicInput, targetLanguage);
          break;
        case 'fullBook':
          res = await generateFullBook(topicInput, targetLanguage);
          break;
      }
      setGeneratorResult(res);
      saveToHistory({ 
        type: action === 'article' ? 'Article' : action === 'ideas' ? 'Ideas' : action === 'bookSummary' ? 'Book Summary' : 'Full Book', 
        title: topicInput.substring(0, 40), 
        content: res 
      });
    } catch (e: any) {
      setGeneratorResult(`**Error:** ${getErrorMessage(e)}`);
    } finally {
      setIsGeneratorLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        setPdfResult(''); // Clear previous results
      } else {
        alert("Please upload a valid PDF file.");
      }
    }
  };

  const handlePdfAction = async () => {
    if (!pdfFile) return;
    setIsPdfLoading(true);
    setPdfResult('');

    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(pdfFile);
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
      });

      const res = await summarizePdf(base64String, targetLanguage);
      setPdfResult(res);
      saveToHistory({
        type: 'PDF Summary',
        title: pdfFile.name,
        content: res
      });
    } catch (e: any) {
      setPdfResult(`**Error processing PDF:** ${getErrorMessage(e)}`);
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#030406] text-[#F8FAFC] font-sans flex flex-col relative">
      {/* Header */}
      <header className="bg-[#0A0C11] border-b border-[#1E293B] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={downloadLogoAsPNG}
              title="Click to download logo as High-Res PNG"
              className="w-8 h-8 md:w-10 md:h-10 bg-[#0A0C11] border border-[#1E293B] rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.15)] flex items-center justify-center hover:scale-105 hover:border-[#3B82F6]/50 transition-all cursor-pointer"
            >
              <MavxonLogo className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <h1 className="text-[18px] md:text-[20px] font-bold tracking-[-0.5px]">
              <span className="text-[#F59E0B]">Mav</span><span className="text-[#3B82F6]">xon</span> <span className="text-[#F8FAFC]">AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 text-[#94A3B8] hover:text-[#F8FAFC] bg-white/[0.02] hover:bg-white/[0.05] border border-[#1E293B] rounded-xl transition-all relative"
              title="View History"
            >
              <History size={18} />
              {history.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#10B981] rounded-full border-2 border-[#0A0C11]"></span>}
            </button>
            <div className="bg-white/[0.02] border border-[#1E293B] rounded-xl px-2 py-1.5 md:px-3 flex flex-col md:flex-row items-center gap-1 md:gap-3 shadow-sm min-w-0">
              <span className="text-[11px] md:text-[12px] text-[#94A3B8] font-medium hidden sm:inline whitespace-nowrap">Output Language:</span>
              <select 
                value={targetLanguage} 
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="bg-transparent text-[13px] md:text-[14px] text-[#F8FAFC] font-semibold focus:outline-none border-none py-1 cursor-pointer appearance-none outline-none w-full max-w-[100px] sm:max-w-none text-center sm:text-left"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang} className="bg-[#0A0C11] text-[#F8FAFC]">{lang}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-4 md:px-6 py-4 md:py-10 pb-24 md:pb-10 flex-1 flex flex-col gap-4 md:gap-6">
        {/* Navigation Tabs (Desktop) */}
        <div className="hidden md:flex p-1 bg-white/[0.03] rounded-xl w-fit flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[13px] font-medium transition-all ${
              activeTab === 'editor'
                ? 'bg-[#4F46E5] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5'
            }`}
          >
            <PenTool size={16} />
            Grammar Hub & AI Rewrite
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[13px] font-medium transition-all ${
              activeTab === 'generator'
                ? 'bg-[#F59E0B] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5'
            }`}
          >
            <Sparkles size={16} />
            Topic Generator & Ideas
          </button>
          <button
            onClick={() => setActiveTab('books')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[13px] font-medium transition-all ${
              activeTab === 'books'
                ? 'bg-[#BE185D] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5'
            }`}
          >
            <BookOpen size={16} />
            Book Writer
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[13px] font-medium transition-all ${
              activeTab === 'pdf'
                ? 'bg-[#8B5CF6] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5'
            }`}
          >
            <FileText size={16} />
            PDF Summarizer
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'editor' && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid lg:grid-cols-[1fr_360px] gap-4 md:gap-8 items-stretch flex-1"
            >
              {/* Input Section */}
              <div className="bg-[#0A0C11] p-5 md:p-8 rounded-2xl shadow-[inset_0_0_40px_rgba(0,0,0,0.2)] border border-[#1E293B] flex flex-col min-h-[300px] md:min-h-[500px]">
                <div className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] flex items-center gap-2 mb-4 md:mb-6">
                  <span className="w-1.5 h-1.5 bg-[#FF6B6B] rounded-full"></span>
                  Your Draft Workspace
                </div>
                <textarea
                  value={editorInput}
                  onChange={(e) => setEditorInput(e.target.value)}
                  placeholder="Start writing or paste your text here..."
                  className="flex-1 resize-none bg-transparent text-[16px] md:text-[18px] leading-[1.6] text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none border-none min-h-[120px]"
                />
                
                <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2 md:gap-3 mt-4 md:mt-6">
                  <button
                    disabled={isEditorLoading}
                    onClick={() => handleEditorAction('grammar')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 rounded-lg text-[13px] transition-colors hover:bg-[#10B981]/20 disabled:opacity-50 font-medium"
                  >
                    <Check size={16} /> Grammar Fix
                  </button>
                  <button
                    disabled={isEditorLoading}
                    onClick={() => handleEditorAction('rewrite')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#4F46E5]/10 text-[#818CF8] border border-[#4F46E5]/20 rounded-lg text-[13px] transition-colors hover:bg-[#4F46E5]/20 disabled:opacity-50 font-medium"
                  >
                    <Sparkles size={16} /> AI Rewrite
                  </button>
                  <button
                    disabled={isEditorLoading}
                    onClick={() => handleEditorAction('translate')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 rounded-lg text-[13px] transition-colors hover:bg-[#F59E0B]/20 disabled:opacity-50 font-medium"
                  >
                    <Languages size={16} /> Translate
                  </button>
                </div>
              </div>

              {/* Result Section */}
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="bg-[#0A0C11] p-5 md:p-6 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.4)] border border-[#1E293B] flex flex-col flex-1 min-h-[250px] md:min-h-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full"></span>
                      AI Insights & Result
                    </div>
                    {editorResult && !isEditorLoading && (
                      <button
                        onClick={() => handleCopy(editorResult)}
                        className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                        title="Copy result"
                      >
                        {copied ? <Check size={16} className="text-[#10B981]" /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] border border-[#4F46E5] rounded-xl p-5 overflow-y-auto">
                    {isEditorLoading ? (
                       <div className="h-full flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
                         <Loader2 size={24} className="animate-spin text-[#4F46E5]" />
                         <p className="text-[14px]">Analyzing text...</p>
                       </div>
                    ) : editorResult ? (
                      <div className="prose prose-invert prose-sm max-w-none text-[#E2E8F0]">
                        <Markdown>{editorResult}</Markdown>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
                        <Bot size={32} className="opacity-20" />
                        <p className="text-[13px] text-center px-4">Insights and modified text will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'generator' && (
            <motion.div
              key="generator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid lg:grid-cols-[1fr_360px] gap-4 md:gap-8 items-stretch flex-1"
            >
              {/* Input Section */}
              <div className="bg-[#0A0C11] p-5 md:p-8 rounded-2xl shadow-[inset_0_0_40px_rgba(0,0,0,0.2)] border border-[#1E293B] flex flex-col min-h-[300px] md:min-h-[500px]">
                <div className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] flex items-center gap-2 mb-4 md:mb-6">
                  <span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full"></span>
                  What do you want to write about?
                </div>
                <textarea
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="E.g. Climate change impacts on coastal areas, The future of remote work..."
                  className="flex-1 w-full resize-none bg-transparent min-h-[120px] text-[16px] md:text-[18px] leading-[1.6] text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none border-none"
                />
                
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-4 md:mt-6">
                  <button
                    disabled={isGeneratorLoading}
                    onClick={() => handleGeneratorAction('article')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#4F46E5]/10 text-[#818CF8] border border-[#4F46E5]/20 rounded-[10px] font-medium transition-all hover:bg-[#4F46E5]/20 disabled:opacity-50 text-[14px]"
                  >
                    <PenTool size={16} /> Generate Article
                  </button>
                  <button
                    disabled={isGeneratorLoading}
                    onClick={() => handleGeneratorAction('ideas')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#14B8A6]/10 text-[#2DD4BF] border border-[#14B8A6]/20 rounded-[10px] font-medium transition-all hover:bg-[#14B8A6]/20 disabled:opacity-50 text-[14px]"
                  >
                    <Lightbulb size={16} /> Brainstorm Ideas
                  </button>
                </div>
              </div>

              {/* Result Section */}
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="bg-[#0A0C11] p-5 md:p-6 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.4)] border border-[#1E293B] flex flex-col flex-1 min-h-[300px] md:min-h-[400px]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full"></span>
                      Generated Content
                    </div>
                    {generatorResult && !isGeneratorLoading && (
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleCopy(generatorResult)}
                          className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-2 text-[13px]"
                        >
                          {copied ? <><Check size={14} className="text-[#10B981]" /> Copied</> : <><Copy size={14} /> Copy</>}
                        </button>
                        <button
                          onClick={() => {
                            const safeName = topicInput?.trim() ? topicInput.trim().replace(/[^a-zA-Z0-9\s-]/g, '').substring(0, 50).trim() : 'Content';
                            handleDownloadPDF(generatorPdfRef, `${safeName || 'MavxonAI-Content'}.pdf`);
                          }}
                          className="text-[#8B5CF6] hover:text-[#A78BFA] transition-colors flex items-center gap-2 text-[13px] font-medium hidden sm:flex"
                        >
                          <Download size={14} /> Download PDF
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] border border-[#4F46E5] rounded-xl p-5 overflow-y-auto">
                    {isGeneratorLoading ? (
                       <div className="h-full flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
                         <Loader2 size={24} className="animate-spin text-[#4F46E5]" />
                         <p className="text-[14px]">Weaving your content together...</p>
                       </div>
                    ) : generatorResult ? (
                      <div className="prose prose-invert prose-sm max-w-none text-[#E2E8F0]">
                        <Markdown>{generatorResult}</Markdown>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
                        <Sparkles size={32} className="opacity-20 mb-2" />
                        <p className="text-[13px] text-center max-w-xs px-4">
                          Share your topic and generating content. Ideas will be formatted here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'books' && (
            <motion.div
              key="books"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid lg:grid-cols-[1fr_360px] gap-4 md:gap-8 items-stretch flex-1"
            >
              <div className="bg-[#0A0C11] p-5 md:p-8 rounded-2xl shadow-[inset_0_0_40px_rgba(0,0,0,0.2)] border border-[#1E293B] flex flex-col min-h-[300px] md:min-h-[500px]">
                <div className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] flex items-center gap-2 mb-4 md:mb-6">
                  <span className="w-1.5 h-1.5 bg-[#BE185D] rounded-full"></span>
                  What book do you want to explore or write?
                </div>
                <textarea
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="E.g. A comprehensive guide to Artificial Intelligence, Atomic Habits..."
                  className="flex-1 w-full resize-none bg-transparent min-h-[120px] text-[16px] md:text-[18px] leading-[1.6] text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none border-none"
                />
                
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-4 md:mt-6">
                  <button
                    disabled={isGeneratorLoading}
                    onClick={() => handleGeneratorAction('bookSummary')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#BE185D]/10 text-[#F43F5E] border border-[#BE185D]/20 rounded-[10px] font-medium transition-all hover:bg-[#BE185D]/20 disabled:opacity-50 text-[14px]"
                  >
                    <BookOpen size={16} /> Book Summary
                  </button>
                  <button
                    disabled={isGeneratorLoading}
                    onClick={() => handleGeneratorAction('fullBook')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#EA580C]/10 text-[#F97316] border border-[#EA580C]/20 rounded-[10px] font-medium transition-all hover:bg-[#EA580C]/20 disabled:opacity-50 text-[14px]"
                  >
                    <BookText size={16} /> Full Book Generation
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4 md:gap-6">
                <div className="bg-[#0A0C11] p-5 md:p-6 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.4)] border border-[#1E293B] flex flex-col flex-1 min-h-[300px] md:min-h-[400px]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full"></span>
                       Generated Book Content
                    </div>
                    {generatorResult && !isGeneratorLoading && (
                      <div className="flex items-center gap-4">
                        <button onClick={() => handleCopy(generatorResult)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-2 text-[13px]">
                          {copied ? <><Check size={14} className="text-[#10B981]" /> Copied</> : <><Copy size={14} /> Copy</>}
                        </button>
                        <button onClick={() => {
                          const safeName = topicInput?.trim() ? topicInput.trim().replace(/[^a-zA-Z0-9\s-]/g, '').substring(0, 50).trim() : 'Book';
                          handleDownloadPDF(generatorPdfRef, `${safeName || 'MavxonAI-Book'}.pdf`);
                        }} className="text-[#8B5CF6] hover:text-[#A78BFA] transition-colors flex items-center gap-2 text-[13px] font-medium hidden sm:flex">
                          <Download size={14} /> Download PDF
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] border border-[#BE185D] rounded-xl p-5 overflow-y-auto">
                    {isGeneratorLoading ? (
                       <div className="h-full flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
                         <Loader2 size={24} className="animate-spin text-[#BE185D]" />
                         <p className="text-[14px]">Authoring your book content...</p>
                       </div>
                    ) : generatorResult ? (
                      <div className="prose prose-invert prose-sm max-w-none text-[#E2E8F0]"><Markdown>{generatorResult}</Markdown></div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
                        <BookOpen size={32} className="opacity-20 mb-2" />
                        <p className="text-[13px] text-center max-w-xs px-4">Provide a topic or title, and the book content will appear here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'pdf' && (
            <motion.div
              key="pdf"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid lg:grid-cols-[1fr_360px] gap-4 md:gap-8 items-stretch flex-1"
            >
              {/* Input Section */}
              <div className="bg-[#0A0C11] p-5 md:p-8 rounded-2xl shadow-[inset_0_0_40px_rgba(0,0,0,0.2)] border border-[#1E293B] flex flex-col min-h-[300px] md:min-h-[500px]">
                <div className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] flex items-center gap-2 mb-4 md:mb-6">
                  <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full"></span>
                  Upload PDF Document
                </div>
                
                <div className="flex-1 w-full border-2 border-dashed border-[#1E293B] bg-white/[0.02] hover:bg-white/[0.04] transition-colors rounded-xl relative flex flex-col items-center justify-center overflow-hidden group">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title=""
                  />
                  
                  {pdfFile ? (
                    <div className="text-center z-0 px-4">
                      <FileText size={48} className="text-[#8B5CF6] mx-auto mb-4" />
                      <p className="text-[#F8FAFC] font-medium break-all">{pdfFile.name}</p>
                      <p className="text-[#94A3B8] text-sm mt-1">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <p className="text-[#4F46E5] text-[13px] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">Click to choose a different file</p>
                    </div>
                  ) : (
                    <div className="text-center z-0 px-4">
                      <Upload size={48} className="text-[#1E293B] group-hover:text-[#4F46E5] transition-colors mx-auto mb-4" />
                      <p className="text-[#F8FAFC] font-medium">Click or drag a PDF here</p>
                      <p className="text-[#94A3B8] text-[13px] mt-1 max-w-xs mx-auto">Upload any PDF file up to 20MB to get an instant summary in your preferred language.</p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-4 md:mt-6">
                  <button
                    disabled={isPdfLoading || !pdfFile}
                    onClick={() => handlePdfAction()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20 rounded-lg text-[14px] font-medium transition-colors hover:bg-[#8B5CF6]/20 disabled:opacity-50"
                  >
                    <FileText size={16} /> Summarize PDF
                  </button>
                </div>
              </div>

              {/* Result Section */}
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="bg-[#0A0C11] p-5 md:p-6 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.4)] border border-[#1E293B] flex flex-col flex-1 min-h-[300px] md:min-h-[400px]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full"></span>
                      PDF Summary
                    </div>
                    {pdfResult && !isPdfLoading && (
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleCopy(pdfResult)}
                          className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-2 text-[13px]"
                        >
                          {copied ? <><Check size={14} className="text-[#10B981]" /> Copied</> : <><Copy size={14} /> Copy</>}
                        </button>
                        <button
                          onClick={() => {
                            const originalName = pdfFile ? pdfFile.name.replace(/\.[^/.]+$/, "") : "Summary";
                            handleDownloadPDF(pdfSummaryRef, `${originalName}-Summary.pdf`);
                          }}
                          className="text-[#8B5CF6] hover:text-[#A78BFA] transition-colors flex items-center gap-2 text-[13px] font-medium"
                        >
                          <Download size={14} /> Download PDF
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] border border-[#8B5CF6] rounded-xl p-5 overflow-y-auto">
                    {isPdfLoading ? (
                       <div className="h-full flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
                         <Loader2 size={24} className="animate-spin text-[#8B5CF6]" />
                         <p className="text-[14px]">Reading and analyzing your PDF...</p>
                       </div>
                    ) : pdfResult ? (
                      <div className="prose prose-invert prose-sm max-w-none text-[#E2E8F0]">
                        <Markdown>{pdfResult}</Markdown>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
                        <FileText size={32} className="opacity-20 mb-2" />
                        <p className="text-[13px] text-center max-w-xs px-4">
                          Upload a PDF and select a language to extract a detailed summary.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0C11]/95 backdrop-blur-md border-t border-[#1E293B] grid grid-cols-4 px-1 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex flex-col items-center gap-1.5 p-1 transition-all ${
              activeTab === 'editor' ? 'text-[#4F46E5]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-all ${activeTab === 'editor' ? 'bg-[#4F46E5]/10' : ''}`}>
               <PenTool size={20} className={activeTab === 'editor' ? 'fill-[#4F46E5]/20' : ''} />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-center">Editor</span>
          </button>
          
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex flex-col items-center gap-1.5 p-1 transition-all ${
              activeTab === 'generator' ? 'text-[#F59E0B]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-all ${activeTab === 'generator' ? 'bg-[#F59E0B]/10' : ''}`}>
              <Sparkles size={20} className={activeTab === 'generator' ? 'fill-[#F59E0B]/20' : ''} />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-center">Generator</span>
          </button>

          <button
            onClick={() => setActiveTab('books')}
            className={`flex flex-col items-center gap-1.5 p-1 transition-all ${
              activeTab === 'books' ? 'text-[#BE185D]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-all ${activeTab === 'books' ? 'bg-[#BE185D]/10' : ''}`}>
              <BookOpen size={20} className={activeTab === 'books' ? 'fill-[#BE185D]/20' : ''} />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-center">Books</span>
          </button>

          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex flex-col items-center gap-1.5 p-1 transition-all ${
              activeTab === 'pdf' ? 'text-[#8B5CF6]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
             <div className={`p-1.5 rounded-lg transition-all ${activeTab === 'pdf' ? 'bg-[#8B5CF6]/10' : ''}`}>
              <FileText size={20} className={activeTab === 'pdf' ? 'fill-[#8B5CF6]/20' : ''} />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-center">PDF Tools</span>
          </button>
        </div>

        {/* Hidden Printable PDF Container (Summary) */}
        {pdfResult && (
          <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -9999 }}>
            <div ref={pdfSummaryRef} style={{ width: '800px', backgroundColor: '#ffffff', padding: '3rem', minHeight: '1100px' }}>
              <div className="pdf-content">
                <Markdown>{pdfResult}</Markdown>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Printable PDF Container (Generator) */}
        {generatorResult && (
          <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -9999 }}>
            <div ref={generatorPdfRef} style={{ width: '800px', backgroundColor: '#ffffff', padding: '3rem', minHeight: '1100px' }}>
              <div className="pdf-content">
                <Markdown>{generatorResult}</Markdown>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Printable PDF Container (History) */}
        {selectedHistory && (
          <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -9999 }}>
            <div ref={historyPdfRef} style={{ width: '800px', backgroundColor: '#ffffff', padding: '3rem', minHeight: '1100px' }}>
              <div className="pdf-content">
                <Markdown>{selectedHistory.content}</Markdown>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* History Sidebar/Modal */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-[100dvh] w-full sm:w-[450px] md:w-[600px] bg-[#0A0C11] border-l border-[#1E293B] z-[101] shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#1E293B] bg-[#0A0C11]/95 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  {selectedHistory ? (
                    <button onClick={() => setSelectedHistory(null)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors p-1">
                       <ArrowRight size={20} className="rotate-180" />
                    </button>
                  ) : (
                    <History className="text-[#10B981]" size={24} />
                  )}
                  <h2 className="text-[18px] font-bold text-[#F8FAFC]">
                    {selectedHistory ? 'Content Details' : 'Generation History'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedHistory && history.length > 0 && (
                     <button onClick={clearHistory} className="text-[#EF4444] hover:text-[#FCA5A5] hover:bg-[#EF4444]/10 p-2 rounded-lg transition-colors flex items-center gap-2 text-[13px] font-medium mr-2">
                       <Trash2 size={16} /> <span className="hidden sm:inline">Clear</span>
                     </button>
                  )}
                  {selectedHistory && (
                    <>
                      <button onClick={() => {
                        const safeTitle = selectedHistory.title ? selectedHistory.title.replace(/[^a-zA-Z0-9\s-]/g, '').substring(0, 40).trim() : 'History';
                        handleDownloadPDF(historyPdfRef, `${safeTitle}-MavxonAI.pdf`);
                      }} className="text-[#8B5CF6] hover:text-[#A78BFA] hover:bg-[#8B5CF6]/10 p-2 rounded-lg transition-colors flex items-center gap-2 text-[13px] font-medium">
                        <DownloadCloud size={16} /> <span className="hidden sm:inline">PDF</span>
                      </button>
                      <button onClick={() => handleCopy(selectedHistory.content)} className="text-[#10B981] hover:text-[#34D399] hover:bg-[#10B981]/10 p-2 rounded-lg transition-colors flex items-center gap-2 text-[13px] font-medium mr-2">
                        {copied ? <Check size={16} /> : <Copy size={16} />} <span className="hidden sm:inline">Copy</span>
                      </button>
                    </>
                  )}
                  <button onClick={() => { setIsHistoryOpen(false); setSelectedHistory(null); }} className="text-[#94A3B8] hover:text-[#F8FAFC] bg-white/[0.05] p-2 rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
                {selectedHistory ? (
                  <div className="bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] border border-[#1E293B] rounded-xl p-5">
                     <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#1E293B]">
                        <span className="text-[12px] font-medium bg-[#8B5CF6]/20 text-[#A78BFA] px-2.5 py-1 rounded-md border border-[#8B5CF6]/20">
                          {selectedHistory.type}
                        </span>
                        <span className="text-[12px] text-[#64748B]">
                           {new Date(selectedHistory.timestamp).toLocaleString()}
                        </span>
                     </div>
                     {selectedHistory.title && <h3 className="text-[16px] font-bold text-[#F8FAFC] mb-4">{selectedHistory.title}</h3>}
                     <div className="prose prose-invert prose-sm max-w-none text-[#E2E8F0]"><Markdown>{selectedHistory.content}</Markdown></div>
                  </div>
                ) : (
                  <>
                    {history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-[#64748B] gap-4">
                        <History size={48} className="opacity-20" />
                        <p className="text-[14px]">Your history is empty.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {history.map((item) => (
                          <div 
                            key={item.id} 
                            onClick={() => setSelectedHistory(item)}
                            className="bg-[#0A0C11] border border-[#1E293B] hover:border-[#3B82F6]/50 rounded-xl p-4 cursor-pointer transition-all hover:bg-white/[0.02] group"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-medium uppercase tracking-wider bg-[#3B82F6]/10 text-[#60A5FA] px-2 py-0.5 rounded border border-[#3B82F6]/20 shrink-0">
                                    {item.type}
                                  </span>
                                  <span className="text-[11px] text-[#64748B] truncate">
                                    {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <h4 className="text-[14px] font-semibold text-[#F8FAFC] truncate mb-1">
                                  {item.title || "Generated Content"}
                                </h4>
                                <p className="text-[12px] text-[#94A3B8] line-clamp-2 leading-relaxed">
                                  {item.content}
                                </p>
                              </div>
                              <div className="text-[#3B82F6] opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                                <ChevronRight size={20} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

