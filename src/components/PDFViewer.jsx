import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFViewer = ({ pdfFile, currentPage, onPageChange, extractedText }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(600);

  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector('.pdf-viewer-container');
      if (container) {
        setPageWidth(Math.min(container.clientWidth - 40, 800));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    if (currentPage > numPages) {
      onPageChange(1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      onPageChange(currentPage + 1);
    }
  };

  const getCurrentPageText = () => {
    if (!extractedText || !extractedText.pages) return '';
    const page = extractedText.pages.find(p => p.page === currentPage);
    return page ? page.text : '';
  };

  if (!pdfFile) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <p className="text-gray-500">No PDF loaded. Please upload a PDF to view.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">PDF Viewer</h2>
      
      <div className="flex justify-center bg-gray-50 rounded-lg p-4 overflow-auto">
        <Document
          file={pdfFile}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="text-gray-600 py-8">Loading PDF...</div>}
          error={<div className="text-red-600 py-8">Failed to load PDF</div>}
        >
          <Page
            pageNumber={currentPage}
            width={pageWidth}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {numPages && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '24px',
          gap: '16px'
        }}>
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            style={{
              background: currentPage > 1 
                ? 'linear-gradient(135deg, #ff7f00 0%, #ff5500 100%)' 
                : '#3d3d3d',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: currentPage > 1 ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              boxShadow: currentPage > 1 ? '0 0 20px rgba(255, 127, 0, 0.3)' : 'none',
              opacity: currentPage > 1 ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (currentPage > 1) {
                e.target.style.boxShadow = '0 0 30px rgba(255, 127, 0, 0.6)';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage > 1) {
                e.target.style.boxShadow = '0 0 20px rgba(255, 127, 0, 0.3)';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            ← Previous
          </button>
          
          <span style={{
            color: '#000',
            fontWeight: '600',
            fontSize: '16px',
            background: 'rgba(255, 127, 0, 0.1)',
            padding: '8px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 127, 0, 0.3)'
          }}>
            Page {currentPage} of {numPages}
          </span>
          
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            style={{
              background: currentPage < numPages 
                ? 'linear-gradient(135deg, #ff7f00 0%, #ff5500 100%)' 
                : '#3d3d3d',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: currentPage < numPages ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              boxShadow: currentPage < numPages ? '0 0 20px rgba(255, 127, 0, 0.3)' : 'none',
              opacity: currentPage < numPages ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (currentPage < numPages) {
                e.target.style.boxShadow = '0 0 30px rgba(255, 127, 0, 0.6)';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage < numPages) {
                e.target.style.boxShadow = '0 0 20px rgba(255, 127, 0, 0.3)';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
