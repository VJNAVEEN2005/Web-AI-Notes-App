import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudUploadAlt, faFilePdf, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const PDFUploader = ({ onUploadSuccess, apiBaseUrl }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please select a valid PDF file');
      setSelectedFile(null);
    }
  };

  const pollStatus = async (jobId, fileBlob, fileUrl) => {
    try {
      const response = await axios.get(`${apiBaseUrl}/status/${jobId}`);
      const data = response.data;

      if (data.state === 'waiting') {
        setProgress(0);
        setTimeout(() => pollStatus(jobId, fileBlob, fileUrl), 1000);
      } else if (data.state === 'processing') {
        const percent = data.percent_complete || 0;
        setProgress(percent);
        setTimeout(() => pollStatus(jobId, fileBlob, fileUrl), 500);
      } else if (data.state === 'done') {
        setProgress(100);
        setProcessing(false);
        setUploading(false);
        
        if (data.result && !data.result.error) {
          onUploadSuccess({
            jobId,
            extractedText: data.result,
            fileName: selectedFile.name,
            fileBlob: fileBlob,
            fileUrl: fileUrl
          });
          setSelectedFile(null);
          setJobId(null);
          setProgress(0);
        } else {
          setError(data.result?.error || 'Processing failed');
        }
      }
    } catch (err) {
      setError('Failed to check status: ' + err.message);
      setProcessing(false);
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProcessing(true);
    setError(null);
    setProgress(0);

    // Create a blob URL for local PDF viewing
    const fileBlob = URL.createObjectURL(selectedFile);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${apiBaseUrl}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { job_id, file_url } = response.data;
      setJobId(job_id);
      pollStatus(job_id, fileBlob, file_url);
    } catch (err) {
      setError('Upload failed: ' + err.message);
      setUploading(false);
      setProcessing(false);
      URL.revokeObjectURL(fileBlob);
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      width: '100%',
      background: '#2d2d2d',
      borderRadius: '16px',
      padding: '40px',
      border: '1px solid rgba(255, 127, 0, 0.3)',
      boxShadow: '0 0 40px rgba(255, 127, 0, 0.2)'
    }}>
      <div style={{textAlign: 'center', marginBottom: '30px'}}>
        <FontAwesomeIcon 
          icon={faFilePdf} 
          size="4x" 
          style={{color: '#ff7f00', marginBottom: '20px'}}
        />
        <h2 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#fff',
          marginBottom: '10px'
        }}>
          Upload PDF Document
        </h2>
        <p style={{color: '#888', fontSize: '14px'}}>
          Upload a PDF to start analyzing with AI
        </p>
      </div>
      
      <div style={{marginBottom: '20px'}}>
        <label style={{
          display: 'block',
          width: '100%',
          padding: '40px 20px',
          border: '2px dashed rgba(255, 127, 0, 0.4)',
          borderRadius: '12px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          background: 'rgba(255, 127, 0, 0.05)',
          opacity: uploading ? 0.5 : 1
        }}
        onMouseEnter={(e) => {
          if (!uploading) {
            e.target.style.background = 'rgba(255, 127, 0, 0.1)';
            e.target.style.borderColor = '#ff7f00';
            e.target.style.boxShadow = '0 0 20px rgba(255, 127, 0, 0.2)';
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(255, 127, 0, 0.05)';
          e.target.style.borderColor = 'rgba(255, 127, 0, 0.4)';
          e.target.style.boxShadow = 'none';
        }}
        >
          <FontAwesomeIcon 
            icon={faCloudUploadAlt} 
            size="3x" 
            style={{color: '#ff7f00', marginBottom: '15px'}}
          />
          <p style={{color: '#fff', fontSize: '16px', marginBottom: '8px'}}>
            {selectedFile ? selectedFile.name : 'Click to select PDF file'}
          </p>
          <p style={{color: '#888', fontSize: '13px'}}>
            {selectedFile 
              ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
              : 'Or drag and drop your file here'}
          </p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{display: 'none'}}
          />
        </label>
      </div>

      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        style={{
          width: '100%',
          padding: '16px',
          background: selectedFile && !uploading
            ? 'linear-gradient(135deg, #ff7f00 0%, #ff5500 100%)'
            : '#3d3d3d',
          border: 'none',
          borderRadius: '12px',
          color: 'white',
          fontSize: '16px',
          fontWeight: '600',
          cursor: selectedFile && !uploading ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'all 0.3s ease',
          boxShadow: selectedFile && !uploading ? '0 0 25px rgba(255, 127, 0, 0.3)' : 'none',
          opacity: selectedFile && !uploading ? 1 : 0.5
        }}
        onMouseEnter={(e) => {
          if (selectedFile && !uploading) {
            e.target.style.boxShadow = '0 0 35px rgba(255, 127, 0, 0.6)';
            e.target.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.boxShadow = selectedFile && !uploading ? '0 0 25px rgba(255, 127, 0, 0.3)' : 'none';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        <FontAwesomeIcon icon={uploading ? faCheckCircle : faCloudUploadAlt} />
        {uploading ? 'Processing...' : 'Upload & Process PDF'}
      </button>

      {processing && (
        <div style={{marginTop: '25px'}}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <p style={{color: '#fff', fontSize: '14px', fontWeight: '600'}}>
              Processing Document
            </p>
            <p style={{color: '#ff7f00', fontSize: '14px', fontWeight: '600'}}>
              {progress}%
            </p>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: '#1a1a1a',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 127, 0, 0.2)'
          }}>
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(135deg, #ff7f00 0%, #ff5500 100%)',
                width: `${progress}%`,
                transition: 'width 0.3s ease',
                boxShadow: '0 0 10px rgba(255, 127, 0, 0.5)'
              }}
            ></div>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '20px',
          background: 'rgba(255, 85, 85, 0.1)',
          border: '1px solid rgba(255, 85, 85, 0.3)',
          color: '#ff5555',
          padding: '15px',
          borderRadius: '10px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default PDFUploader;
