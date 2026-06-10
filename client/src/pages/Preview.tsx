import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2Icon } from 'lucide-react';
import type { Project } from '../types'; // Adjusted to typical types folder
import ProjectPreview from '../componenets/ProjectPreview';
import api from '@/config/Axios'; // Import your configured axios instance
import { toast } from 'sonner';

const Preview = () => {
  // If you plan to use versionId later, you can pass it to your API endpoint
  const { projectId, versionId } = useParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCode = async () => {
    try {
      // Using your Axios instance so auth tokens are automatically attached
      const { data } = await api.get(`/api/project/preview/${projectId}`);
      
      if (data?.project?.current_code) {
        setCode(data.project.current_code);
      } else {
        toast.error("No code found for this project.");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to load project preview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchCode();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader2Icon className='size-7 animate-spin text-indigo-200' />
      </div>
    );
  }

  return (
    <div className='h-screen'>
      {code ? (
        <ProjectPreview 
          project={{ current_code: code } as Project} 
          isGenerating={false} 
          showEditorPanel={false} 
        />
      ) : (
        <div className='flex items-center justify-center h-screen text-gray-400'>
          <p>Failed to load preview or no code available.</p>
        </div>
      )}
    </div>
  );
};

export default Preview;