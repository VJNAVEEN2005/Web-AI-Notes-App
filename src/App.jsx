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
import './App.css';

const API_BASE_URL = 'https://naveenvj-askmypdf-backend.hf.space';

function App() {
  const [pdfData, setPdfData] = useState(null);
  const [extractedText, setExtractedText] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [activeView, setActiveView] = useState('chat'); // 'chat' or 'pdf'
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfData?.fileBlob) {
        URL.revokeObjectURL(pdfData.fileBlob);
      }
    };
  }, [pdfData]);

  const handleUploadSuccess = (data) => {
    console.log('Upload success data:', data);
    setPdfData(data);
    setExtractedText(data.extractedText);
    setCurrentPage(1);
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to PDF viewer
    const pdfViewerElement = document.querySelector('.pdf-viewer');
    if (pdfViewerElement) {
      pdfViewerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleApiKeySave = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setShowApiKeyInput(false);
  };

  const handleNewUpload = () => {
    if (pdfData?.fileBlob) {
      URL.revokeObjectURL(pdfData.fileBlob);
    }
    setPdfData(null);
    setExtractedText(null);
    setCurrentPage(1);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="sidebar">
          <div className="sidebar-header">
            <button 
              className="new-chat-btn"
              onClick={handleNewUpload}
            >
              <FontAwesomeIcon icon={faPlus} />
              New Chat
            </button>
          </div>

          <div className="sidebar-content">
            <div className="sidebar-section">
              <h3>Navigation</h3>
              <button 
                className={`nav-item ${activeView === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveView('chat')}
              >
                <FontAwesomeIcon icon={faComments} />
                Chat Interface
              </button>
              <button 
                className={`nav-item ${activeView === 'pdf' ? 'active' : ''}`}
                onClick={() => setActiveView('pdf')}
                disabled={!pdfData}
                style={{opacity: !pdfData ? 0.5 : 1}}
              >
                <FontAwesomeIcon icon={faFilePdf} />
                PDF Viewer
              </button>
            </div>

            {pdfData && (
              <div className="sidebar-section">
                <h3>Current PDF</h3>
                <div style={{padding: '12px', color: '#888', fontSize: '13px'}}>
                  <FontAwesomeIcon icon={faFilePdf} style={{marginRight: '8px', color: '#ff7f00'}} />
                  {pdfData.fileName}
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-footer">
            <button 
              className="nav-item"
              onClick={() => setShowApiKeyInput(true)}
            >
              <FontAwesomeIcon icon={faKey} />
              API Settings
            </button>
            {pdfData && (
              <button 
                className="nav-item"
                onClick={handleNewUpload}
                style={{color: '#ff5555'}}
              >
                <FontAwesomeIcon icon={faTrash} />
                Clear PDF
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'absolute',
            top: '20px',
            left: sidebarOpen ? '270px' : '20px',
            zIndex: 100,
            background: 'rgba(255, 127, 0, 0.2)',
            border: '1px solid rgba(255, 127, 0, 0.4)',
            borderRadius: '8px',
            padding: '10px 15px',
            color: '#ff7f00',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          <FontAwesomeIcon icon={faBars} />
        </button>

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
        {!pdfData ? (
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
        ) : (
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
            {activeView === 'chat' ? (
              <ChatInterface
                extractedText={extractedText}
                onPageClick={handlePageClick}
                apiKey={apiKey}
              />
            ) : (
              <div style={{flex: 1, overflow: 'auto', padding: '20px'}}>
                <PDFViewer
                  pdfFile={pdfData.fileBlob}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  extractedText={extractedText}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
