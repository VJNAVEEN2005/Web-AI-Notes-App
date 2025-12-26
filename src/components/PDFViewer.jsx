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
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          
          <span className="text-gray-700 font-medium">
            Page {currentPage} of {numPages}
          </span>
          
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {extractedText && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Extracted Text (Page {currentPage})</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
              {getCurrentPageText() || 'No text extracted from this page'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
