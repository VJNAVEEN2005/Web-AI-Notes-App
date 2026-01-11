import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faRobot, faUser, faComments } from '@fortawesome/free-solid-svg-icons';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatInterface = ({ chat, extractedText, onPageClick, apiKey, onUpdateMessages, vectorDB }) => {
  const [messages, setMessages] = useState(chat?.messages || []);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [genAI, setGenAI] = useState(null);
  const messagesEndRef = useRef(null);

  // Update messages when chat changes
  useEffect(() => {
    if (chat) {
      setMessages(chat.messages || []);
    }
  }, [chat?.id]);

  // Update parent component when messages change
  useEffect(() => {
    if (onUpdateMessages && messages.length > 0) {
      onUpdateMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    if (apiKey) {
      setGenAI(new GoogleGenerativeAI(apiKey));
    }
  }, [apiKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const buildContext = () => {
    if (!extractedText || !extractedText.pages) return '';
    
    return extractedText.pages
      .map(page => `[Page ${page.page}]\n${page.text}`)
      .join('\n\n---\n\n');
  };

  const parsePageReferences = (text) => {
    // Look for patterns like "Page 1", "page 2", etc.
    const pagePattern = /\b[Pp]age\s+(\d+)\b/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = pagePattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }
      
      // Add the page reference as a clickable link
      parts.push({
        type: 'page-link',
        content: match[0],
        pageNumber: parseInt(match[1])
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
    
    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !extractedText || !genAI) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage
    }]);

    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      
      let context = '';
      
      // Use RAG if vectorDB is available
      if (vectorDB) {
        // Retrieve relevant chunks using vector similarity search
        const searchResults = await vectorDB.search(userMessage, 5);
        
        // Build context from retrieved chunks
        context = searchResults
          .map((result, index) => {
            const chunk = result.chunk;
            return `[Relevant Excerpt ${index + 1} from Page ${chunk.pageNumber}]\n${chunk.text}`;
          })
          .join('\n\n---\n\n');
      } else {
        // Fallback to full context if no vector DB
        context = buildContext();
      }
      
      const prompt = `You are a helpful AI assistant analyzing a PDF document. Here are the most relevant excerpts from the document:

${context}

User Question: ${userMessage}

Instructions:
- Answer the question based ONLY on the provided excerpts
- Always mention the specific page number(s) where you found the information (e.g., "According to Page 3...")
- If the answer spans multiple pages, mention all relevant pages
- If the information is not in the excerpts, say so clearly
- Be concise but thorough
- Format your response naturally, mentioning page numbers inline

Answer:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: text
      }]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}. Please check your API key and try again.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!extractedText) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
        textAlign: 'center',
        padding: '40px'
      }}>
        <div>
          <FontAwesomeIcon icon={faRobot} size="3x" style={{color: '#ff7f00', marginBottom: '20px'}} />
          <p style={{fontSize: '18px'}}>Upload and process a PDF to start asking questions</p>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
        textAlign: 'center',
        padding: '40px'
      }}>
        <div>
          <FontAwesomeIcon icon={faRobot} size="3x" style={{color: '#ff7f00', marginBottom: '20px'}} />
          <p style={{fontSize: '18px'}}>Please enter your Gemini API key to enable Q&A</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#1a1a1a'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '20px 30px',
        borderBottom: '1px solid rgba(255, 127, 0, 0.2)',
        background: '#0d0d0d',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <h2 style={{
          color: '#fff',
          fontSize: '20px',
          fontWeight: '600',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <FontAwesomeIcon icon={faComments} style={{color: '#ff7f00'}} />
          {chat?.title || 'Chat'}
        </h2>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#888'
          }}>
            <FontAwesomeIcon icon={faRobot} size="3x" style={{color: '#ff7f00', marginBottom: '20px'}} />
            <p style={{fontSize: '18px', fontWeight: '600', marginBottom: '10px', color: '#fff'}}>
              Start asking questions about your PDF!
            </p>
            <p style={{fontSize: '14px', color: '#888'}}>
              Try: "What is this document about?" or "Summarize the main points"
            </p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div key={index} style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'flex-start',
            padding: message.role === 'user' ? '15px 20px' : '20px',
            background: message.role === 'user' ? '#2d2d2d' : '#0d0d0d',
            borderRadius: '12px',
            border: `1px solid ${message.role === 'user' ? 'rgba(255, 127, 0, 0.2)' : 'rgba(255, 127, 0, 0.1)'}`,
          }}>
            <div style={{
              width: '35px',
              height: '35px',
              borderRadius: '50%',
              background: message.role === 'user' 
                ? 'linear-gradient(135deg, #ff7f00 0%, #ff5500 100%)'
                : 'linear-gradient(135deg, #555 0%, #333 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: message.role === 'user' ? '0 0 20px rgba(255, 127, 0, 0.4)' : 'none'
            }}>
              <FontAwesomeIcon 
                icon={message.role === 'user' ? faUser : faRobot} 
                style={{color: '#fff', fontSize: '16px'}}
              />
            </div>
            <div style={{flex: 1, color: '#fff', lineHeight: '1.6', fontSize: '15px'}}>
              {message.role === 'assistant' ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({node, ...props}) => <p style={{marginBottom: '12px'}} {...props} />,
                    h1: ({node, ...props}) => <h1 style={{color: '#ff7f00', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px'}} {...props} />,
                    h2: ({node, ...props}) => <h2 style={{color: '#ff7f00', fontSize: '20px', fontWeight: 'bold', marginBottom: '10px'}} {...props} />,
                    h3: ({node, ...props}) => <h3 style={{color: '#ff7f00', fontSize: '18px', fontWeight: 'bold', marginBottom: '8px'}} {...props} />,
                    code: ({node, inline, ...props}) => inline 
                      ? <code style={{background: 'rgba(255, 127, 0, 0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '14px', color: '#ff7f00'}} {...props} />
                      : <code style={{display: 'block', background: '#1a1a1a', padding: '12px', borderRadius: '8px', fontSize: '14px', overflowX: 'auto', border: '1px solid rgba(255, 127, 0, 0.2)', marginBottom: '12px'}} {...props} />,
                    ul: ({node, ...props}) => <ul style={{marginLeft: '20px', marginBottom: '12px', listStyleType: 'disc'}} {...props} />,
                    ol: ({node, ...props}) => <ol style={{marginLeft: '20px', marginBottom: '12px'}} {...props} />,
                    li: ({node, ...props}) => <li style={{marginBottom: '6px'}} {...props} />,
                    strong: ({node, ...props}) => <strong style={{color: '#ff7f00', fontWeight: 'bold'}} {...props} />,
                    em: ({node, ...props}) => <em style={{color: '#ffaa55'}} {...props} />,
                    a: ({node, ...props}) => <a style={{color: '#ff7f00', textDecoration: 'underline'}} {...props} />,
                    blockquote: ({node, ...props}) => <blockquote style={{borderLeft: '4px solid #ff7f00', paddingLeft: '16px', marginLeft: '0', marginBottom: '12px', color: '#ccc'}} {...props} />,
                  }}
                >
                  {message.content.replace(/\b[Pp]age\s+(\d+)\b/g, (match, pageNum) => {
                    return `[${match}](#page-${pageNum})`;
                  })}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'flex-start',
            padding: '20px',
            background: '#0d0d0d',
            borderRadius: '12px',
            border: '1px solid rgba(255, 127, 0, 0.1)'
          }}>
            <div style={{
              width: '35px',
              height: '35px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #555 0%, #333 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FontAwesomeIcon icon={faRobot} style={{color: '#fff', fontSize: '16px'}} />
            </div>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '8px'}}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ff7f00',
                animation: 'bounce 1.4s infinite ease-in-out',
                animationDelay: '0s'
              }}></div>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ff7f00',
                animation: 'bounce 1.4s infinite ease-in-out',
                animationDelay: '0.2s'
              }}></div>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ff7f00',
                animation: 'bounce 1.4s infinite ease-in-out',
                animationDelay: '0.4s'
              }}></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '20px',
        background: '#0d0d0d',
        borderTop: '1px solid rgba(255, 127, 0, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your PDF..."
            style={{
              flex: 1,
              background: '#2d2d2d',
              border: '1px solid rgba(255, 127, 0, 0.3)',
              borderRadius: '12px',
              padding: '14px 18px',
              color: '#fff',
              fontSize: '15px',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              minHeight: '50px',
              maxHeight: '150px'
            }}
            rows="1"
            disabled={isLoading}
            onFocus={(e) => {
              e.target.style.borderColor = '#ff7f00';
              e.target.style.boxShadow = '0 0 15px rgba(255, 127, 0, 0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 127, 0, 0.3)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            style={{
              background: inputMessage.trim() && !isLoading 
                ? 'linear-gradient(135deg, #ff7f00 0%, #ff5500 100%)'
                : '#3d3d3d',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 24px',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              boxShadow: inputMessage.trim() && !isLoading ? '0 0 20px rgba(255, 127, 0, 0.3)' : 'none',
              opacity: inputMessage.trim() && !isLoading ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (inputMessage.trim() && !isLoading) {
                e.target.style.boxShadow = '0 0 30px rgba(255, 127, 0, 0.6)';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = inputMessage.trim() && !isLoading ? '0 0 20px rgba(255, 127, 0, 0.3)' : 'none';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatInterface;
