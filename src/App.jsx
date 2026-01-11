import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faFilePdf, 
  faComments, 
  faKey, 
  faUpload,
  faTrash,
  faBars
} from '@fortawesome/free-solid-svg-icons';
import PDFUploader from './components/PDFUploader';
import PDFViewer from './components/PDFViewer';
import ChatInterface from './components/ChatInterface';
import VectorDB from './services/vectorDB';
import './App.css';
import localforage from 'localforage';

const API_BASE_URL = 'https://naveenvj-askmypdf-backend.hf.space';

function App() {
  const [pdfs, setPdfs] = useState([]); // Array of all uploaded PDFs
  const [chats, setChats] = useState([]); // Array of all chat sessions
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentPdfId, setCurrentPdfId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [activeView, setActiveView] = useState('chat'); // 'chat' or 'pdf'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [vectorDBs, setVectorDBs] = useState({}); // Store vectorDB instances by pdfId

  useEffect(() => {
  // Check what's stored
  localforage.keys().then(keys => {
    console.log('All stored keys:', keys);
  });
}, []);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedPdfs = localStorage.getItem('all_pdfs');
    const savedChats = localStorage.getItem('all_chats');
    const savedCurrentChatId = localStorage.getItem('current_chat_id');
    const savedCurrentPdfId = localStorage.getItem('current_pdf_id');

    if (savedPdfs) {
      try {
        const parsedPdfs = JSON.parse(savedPdfs);
        // Recreate blob URLs from base64 data
        const pdfsWithBlobs = parsedPdfs.map(pdf => {
          if (pdf.fileData) {
            // Convert base64 back to blob
            const byteCharacters = atob(pdf.fileData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            return { ...pdf, fileBlob: blobUrl };
          }
          return pdf;
        });
        setPdfs(pdfsWithBlobs);
        
        // Restore vectorDB instances
        pdfsWithBlobs.forEach(async (pdf) => {
          if (pdf.vectorDBId) {
            const vectorDB = new VectorDB(pdf.vectorDBId);
            await vectorDB.initialize();
            setVectorDBs(prev => ({
              ...prev,
              [pdf.id]: vectorDB
            }));
          }
        });
      } catch (error) {
        console.error('Error loading PDFs:', error);
      }
    }

    if (savedChats) {
      try {
        setChats(JSON.parse(savedChats));
      } catch (error) {
        console.error('Error loading chats:', error);
      }
    }

    if (savedCurrentChatId) {
      setCurrentChatId(savedCurrentChatId);
    }

    if (savedCurrentPdfId) {
      setCurrentPdfId(savedCurrentPdfId);
    }
  }, []);

  // Save PDFs to localStorage
  useEffect(() => {
    if (pdfs.length > 0) {
      // Store PDFs without blob URLs (use fileData instead)
      const pdfsToSave = pdfs.map(pdf => {
        const { fileBlob, ...pdfWithoutBlob } = pdf;
        return pdfWithoutBlob;
      });
      localStorage.setItem('all_pdfs', JSON.stringify(pdfsToSave));
    } else {
      localStorage.removeItem('all_pdfs');
    }
  }, [pdfs]);

  // Save chats to localStorage
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('all_chats', JSON.stringify(chats));
    }
  }, [chats]);

  // Save current chat ID
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem('current_chat_id', currentChatId);
    }
  }, [currentChatId]);

  // Save current PDF ID
  useEffect(() => {
    if (currentPdfId) {
      localStorage.setItem('current_pdf_id', currentPdfId);
    }
  }, [currentPdfId]);

  // Get current PDF and chat data
  const currentPdf = pdfs.find(pdf => pdf.id === currentPdfId);
  const currentChat = chats.find(chat => chat.id === currentChatId);

  const handleUploadSuccess = async (data) => {
    // Check if this is an update for existing PDF (vectorDB ready)
    if (data.vectorDBReady && data.vectorDB) {
      const existingPdf = pdfs.find(p => p.vectorDBId === data.pdfId);
      if (existingPdf) {
        console.log('Vector DB ready for existing PDF:', existingPdf.id);
        setVectorDBs(prev => ({
          ...prev,
          [existingPdf.id]: data.vectorDB
        }));
        return;
      }
    }
    
    // New PDF upload
    const newPdfId = 'pdf_' + Date.now();
    
    // Convert blob to base64 for storage
    let fileData = null;
    if (data.fileBlob) {
      try {
        const response = await fetch(data.fileBlob);
        const blob = await response.blob();
        const reader = new FileReader();
        fileData = await new Promise((resolve) => {
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error converting PDF to base64:', error);
      }
    }
    
    const newPdf = {
      id: newPdfId,
      fileName: data.fileName,
      fileBlob: data.fileBlob,
      fileData: fileData, // Store base64 for persistence
      fileUrl: data.fileUrl,
      jobId: data.jobId,
      extractedText: data.extractedText,
      uploadedAt: new Date().toISOString(),
      vectorDBId: data.pdfId // Store the vectorDB ID
    };

    console.log('Adding new PDF:', newPdf.fileName);
    setPdfs(prev => [...prev, newPdf]);
    setCurrentPdfId(newPdfId);
    
    // Store vectorDB instance if ready
    if (data.vectorDB) {
      console.log('Vector DB already ready, storing...');
      setVectorDBs(prev => ({
        ...prev,
        [newPdfId]: data.vectorDB
      }));
    }
    
    // Create a new chat for this PDF
    const newChatId = 'chat_' + Date.now();
    const newChat = {
      id: newChatId,
      pdfId: newPdfId,
      title: data.fileName.replace('.pdf', ''),
      messages: [],
      createdAt: new Date().toISOString()
    };
    
    console.log('Creating new chat:', newChat.title);
    setChats(prev => [...prev, newChat]);
    setCurrentChatId(newChatId);
    setCurrentPage(1);
    setActiveView('chat');
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
    setActiveView('pdf');
  };

  const handleApiKeySave = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setShowApiKeyInput(false);
  };

  const handleNewChat = () => {
    if (!currentPdfId) return;
    
    const newChatId = 'chat_' + Date.now();
    const pdf = pdfs.find(p => p.id === currentPdfId);
    const newChat = {
      id: newChatId,
      pdfId: currentPdfId,
      title: `New Chat - ${pdf?.fileName || 'PDF'}`,
      messages: [],
      createdAt: new Date().toISOString()
    };
    
    setChats(prev => [...prev, newChat]);
    setCurrentChatId(newChatId);
    setActiveView('chat');
  };

  const handleSelectPdf = (pdfId) => {
    setCurrentPdfId(pdfId);
    // Find or create a chat for this PDF
    const chatForPdf = chats.find(chat => chat.pdfId === pdfId);
    if (chatForPdf) {
      setCurrentChatId(chatForPdf.id);
    } else {
      // Create new chat for this PDF
      const pdf = pdfs.find(p => p.id === pdfId);
      const newChatId = 'chat_' + Date.now();
      const newChat = {
        id: newChatId,
        pdfId: pdfId,
        title: pdf?.fileName.replace('.pdf', '') || 'New Chat',
        messages: [],
        createdAt: new Date().toISOString()
      };
      setChats(prev => [...prev, newChat]);
      setCurrentChatId(newChatId);
    }
    setActiveView('chat');
  };

  const handleSelectChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setCurrentPdfId(chat.pdfId);
      setActiveView('chat');
    }
  };

  const handleDeletePdf = async (pdfId) => {
    // Clean up vectorDB if exists
    if (vectorDBs[pdfId]) {
      await vectorDBs[pdfId].clear();
      setVectorDBs(prev => {
        const newDBs = { ...prev };
        delete newDBs[pdfId];
        return newDBs;
      });
    }
    
    // Delete PDF
    setPdfs(prev => prev.filter(p => p.id !== pdfId));
    
    // Delete all chats associated with this PDF
    setChats(prev => prev.filter(c => c.pdfId !== pdfId));
    
    // If currently viewing this PDF, clear selection
    if (currentPdfId === pdfId) {
      setCurrentPdfId(null);
      setCurrentChatId(null);
    }
  };

  const handleDeleteChat = (chatId) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    
    if (currentChatId === chatId) {
      // Switch to another chat or clear
      const remainingChats = chats.filter(c => c.id !== chatId);
      if (remainingChats.length > 0) {
        setCurrentChatId(remainingChats[0].id);
        setCurrentPdfId(remainingChats[0].pdfId);
      } else {
        setCurrentChatId(null);
      }
    }
  };

  const updateChatMessages = (chatId, messages) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, messages } : chat
    ));
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="sidebar">
          <div className="sidebar-header">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
              <h2 style={{color: '#ff7f00', fontSize: '18px', fontWeight: 'bold', margin: 0}}>AI Notes App</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 127, 0, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#ff7f00',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 127, 0, 0.1)';
                  e.target.style.borderColor = '#ff7f00';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.borderColor = 'rgba(255, 127, 0, 0.3)';
                }}
              >
                <FontAwesomeIcon icon={faBars} />
              </button>
            </div>
            <button 
              className="new-chat-btn"
              onClick={handleNewChat}
              disabled={!currentPdfId}
              style={{opacity: currentPdfId ? 1 : 0.5}}
            >
              <FontAwesomeIcon icon={faPlus} />
              New Chat
            </button>
          </div>

          <div className="sidebar-content">
            {/* Chats Section */}
            {chats.length > 0 && (
              <div className="sidebar-section">
                <h3>Chats</h3>
                {chats.map(chat => (
                  <div key={chat.id} style={{position: 'relative'}}>
                    <button 
                      className={`nav-item ${currentChatId === chat.id ? 'active' : ''}`}
                      onClick={() => handleSelectChat(chat.id)}
                      style={{paddingRight: '40px'}}
                    >
                      <FontAwesomeIcon icon={faComments} />
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1
                      }}>
                        {chat.title}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat.id);
                      }}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#ff5555',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255, 85, 85, 0.2)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* PDFs Section */}
            <div className="sidebar-section">
              <h3>My PDFs</h3>
              {pdfs.length === 0 ? (
                <p style={{padding: '12px', color: '#666', fontSize: '13px'}}>
                  No PDFs uploaded yet
                </p>
              ) : (
                pdfs.map(pdf => (
                  <div key={pdf.id} style={{position: 'relative'}}>
                    <button 
                      className={`nav-item ${currentPdfId === pdf.id ? 'active' : ''}`}
                      onClick={() => handleSelectPdf(pdf.id)}
                      style={{paddingRight: '40px'}}
                    >
                      <FontAwesomeIcon icon={faFilePdf} />
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1
                      }}>
                        {pdf.fileName}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${pdf.fileName}" and all associated chats?`)) {
                          handleDeletePdf(pdf.id);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#ff5555',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255, 85, 85, 0.2)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Navigation Section */}
            <div className="sidebar-section">
              <h3>View</h3>
              <button 
                className={`nav-item ${activeView === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveView('chat')}
                disabled={!currentChatId}
                style={{opacity: currentChatId ? 1 : 0.5}}
              >
                <FontAwesomeIcon icon={faComments} />
                Chat
              </button>
              <button 
                className={`nav-item ${activeView === 'pdf' ? 'active' : ''}`}
                onClick={() => setActiveView('pdf')}
                disabled={!currentPdf}
                style={{opacity: currentPdf ? 1 : 0.5}}
              >
                <FontAwesomeIcon icon={faFilePdf} />
                PDF Viewer
              </button>
            </div>
          </div>

          <div className="sidebar-footer">
            <button 
              className="nav-item"
              onClick={() => setActiveView('upload')}
            >
              <FontAwesomeIcon icon={faUpload} />
              Upload PDF
            </button>
            <button 
              className="nav-item"
              onClick={() => setShowApiKeyInput(true)}
            >
              <FontAwesomeIcon icon={faKey} />
              API Settings
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Toggle Sidebar Button - Only show when sidebar is closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              position: 'fixed',
              top: '20px',
              left: '20px',
              zIndex: 1000,
              background: 'linear-gradient(135deg, #ff7f00 0%, #ff5500 100%)',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 20px rgba(255, 127, 0, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = '0 0 30px rgba(255, 127, 0, 0.7)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 0 20px rgba(255, 127, 0, 0.4)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
        )}

        {/* API Key Modal */}
        {showApiKeyInput && (
          <div className="api-key-modal">
            <div className="api-key-content">
              <h2>Gemini API Key</h2>
              <p style={{color: '#ccc', fontSize: '14px'}}>
                Enter your Gemini API key to enable AI chat functionality
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key here..."
              />
              <p style={{color: '#888', fontSize: '12px', marginTop: '10px'}}>
                Get your free API key from{' '}
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{color: '#ff7f00', textDecoration: 'none'}}
                >
                  Google AI Studio
                </a>
              </p>
              <div className="api-key-buttons">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowApiKeyInput(false)}
                >
                  Cancel
                </button>
                <button 
                  className="save-btn"
                  onClick={handleApiKeySave}
                >
                  Save API Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        {activeView === 'upload' || (!currentPdf && !currentChat) ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <PDFUploader
              onUploadSuccess={handleUploadSuccess}
              apiBaseUrl={API_BASE_URL}
            />
          </div>
        ) : activeView === 'chat' && currentChat ? (
          <ChatInterface
            chat={currentChat}
            extractedText={currentPdf?.extractedText}
            onPageClick={handlePageClick}
            apiKey={apiKey}
            onUpdateMessages={(messages) => updateChatMessages(currentChat.id, messages)}
            vectorDB={vectorDBs[currentPdfId]}
          />
        ) : activeView === 'pdf' && currentPdf ? (
          <div style={{flex: 1, overflow: 'auto', padding: '20px'}}>
            <PDFViewer
              pdfFile={currentPdf.fileBlob}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              extractedText={currentPdf.extractedText}
            />
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888'
          }}>
            <p>Select a PDF or chat to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
