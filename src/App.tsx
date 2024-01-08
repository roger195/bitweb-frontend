import { useState, useRef, useEffect } from 'react'
import axios from 'axios';
import { Button } from 'primereact/button';
import { FileUpload, FileUploadOptions } from 'primereact/fileupload';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import WordCloud from './WordCloud';

import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import './App.css'

export interface WordData {
  identifier: string | null;
  uploadStatus: string | null;
  wordCounts: WordCount[] | undefined;
}

export interface WordCount {
  word: string;
  count: number;
}

function App() {
  const [identifier, setIdentifier] = useState('');
  const [results, setResults] = useState<WordData>({identifier:null, uploadStatus:null, wordCounts:undefined});
  const [loading, setLoading] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [status, setStatus] = useState<string>('');
  const fileUploadRef = useRef<FileUpload>(null);
  const toast = useRef(null);
  
  const showSuccess = (message: string) => {
    toast.current.show({severity:'success', summary: 'Success', detail:message, life: 5000});
  }
  const showError = (message: string) => {
    toast.current.show({severity:'error', summary: 'Error', detail:message, life: 5000});
}

  useEffect(() => {
    const updateWindowSize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', updateWindowSize);
    return () => {
      window.removeEventListener('resize', updateWindowSize);
    };
  });

  useEffect(() => {
    const checkUploadStatus = async () => {
      if (identifier !== '') {
        try {
          const url = `http://localhost:8000/upload/status?identifier=${identifier}`;
          const response = await axios.get(url, { withCredentials: true });
          const newStatus = await response.data;
          setStatus(newStatus);
  
          if (newStatus !== 'PROCESSING') {
            setLoading(false);
            let message = 'File upload ' + newStatus.toLowerCase();
            if (newStatus === 'COMPLETED') {
              showSuccess(message);
            }
            else if (newStatus === 'FAILED') {
              showError(message);
            }
            return;
          }
          setTimeout(checkUploadStatus, 1000);
        } catch (error) {
          showError('Error checking upload status:' + error);
        }
      }
    };
    checkUploadStatus();
    return () => {
    };
  }, [identifier]);

  const isDataPresent = () => {
    if (results !== undefined) {
      if (results.wordCounts !== undefined && results.wordCounts !== null) {
        return true;
      }
    }
    return false;
  }

  const copyJSONtoClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(results.wordCounts, null, 2))
    .then(() => {
      showSuccess('Text successfully copied to clipboard:');
    })
    .catch((err) => {
      showError('Unable to copy text to clipboard. ' + err);
    });
  };

  const getWordCounts = () => {
    if (results.wordCounts !== undefined && results.wordCounts !== null) {
      return results.wordCounts.slice(0, 100)
    }
    return [];
  }

  const onUpload = (response: any) => {
    setIdentifier(response.xhr.response);
  };

  const handleFileUpload = async (e:any) => {
    if (e.files[0]) {
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', e.files[0]);
  
        const response = await axios.post('http://localhost:8000/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setIdentifier(response.data);
        if (fileUploadRef.current) {
          fileUploadRef.current.clear();
        }
      } catch (uploadError) {
        showError('File upload failed. Please try again.');
        setLoading(false);
      }
    } else {
      alert('Please select a file before uploading.');
    }
    
  };
  
  const fetchFileWords = async () => {
    const url = `http://localhost:8000/upload?identifier=${identifier}`;
    try {
      const response = await axios.get(url, { withCredentials: true });
      setResults(response.data);
      if (response.data.uploadStatus == 'PROCESSING') {
        if (loading == false) setLoading(true);
        await new Promise(f => setTimeout(f, 1000));
        fetchFileWords();
      }
      setLoading(false);
    } catch (error) {
      showError('Error sending request: ' + error);
    }
  };

  return (
    <div className='flex flex-column gap-5'>
      <h1>Word Cloud App</h1>
      <div>
        <p>Step 1: Upload File(.txt)</p>
        <div className='flex justify-content-center gap-2'>
          <Toast ref={toast} />
          {loading ? (<ProgressSpinner />
          ) : (
          <FileUpload
            mode="basic"
            auto
            ref={fileUploadRef}
            disabled={loading}
            chooseLabel='Upload file'
            accept=".txt"
            url='http://localhost:8000/upload'
            customUpload
            maxFileSize={104857600}
            uploadHandler={handleFileUpload}
            onUpload={onUpload}
          />
          )}
          
        </div>
      </div>
      <div>
        <p>Step 2: Submit identifier to generate word count JSON and word cloud </p>
        <div className="flex justify-content-center gap-2">
          <span className="p-float-label p-input-icon-right">
              <InputText 
                id='identifier' 
                type='text' 
                value={identifier} onChange={(e) => setIdentifier(e.target.value)} 
              />
              <label htmlFor="identifier">Identifier</label>   
          </span>
          <Button
            label='Submit'
            onClick={fetchFileWords}
            disabled={loading}
            style={{ borderRadius: '6px' }}
          >
          </Button>
          <Button 
            label='Copy JSON'
            icon='pi pi-copy'
            disabled={!isDataPresent()}
            onClick={copyJSONtoClipboard}>  
          </Button>
        </div>
      </div>
      {isDataPresent() && (
        <div className='cards flex flex-row justify-content-around gap-4' style={{height: '500px'}}>
          <Card className='flex overflow-auto' style={{minWidth:350, maxHeight:500}}>
            <pre style={{ textAlign: 'left' }}>{JSON.stringify(results.wordCounts, null, 2)}</pre>
          </Card>
          <Card className='flex justify-content-center flex-1'>
            <WordCloud
              width={viewportWidth/2.5}
              height={400}
              showControls={true}
              wordCounts={getWordCounts()}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

export default App
