import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2Icon } from 'lucide-react';
import ProjectPreview from '../componenets/ProjectPreview';
import type { Project } from '../types';
import api from '@/config/Axios';
import { toast } from 'sonner';

const View = () => {
  const { projectId } = useParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCode = async () => {
    try {
      // Connects to your getProjectById controller for published projects
      const { data } = await api.get(`/api/project/published/${projectId}`);
      
      if (data?.code) {
        setCode(data.code);
      } else {
        toast.error("No code found for this project.");
      }
    } catch (error: any) {
      console.error(error);
      // Handles the 404 error if the project is unpublished or doesn't exist
      toast.error(error.response?.data?.message || "Failed to load project");
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
      <div className='flex items-center justify-center h-screen bg-gray-900'>
        <Loader2Icon className='size-7 animate-spin text-indigo-400' />
      </div>
    );
  }

  return (
    <div className='h-screen bg-white'>
      {code ? (
        <ProjectPreview 
          project={{ current_code: code } as Project} 
          isGenerating={false} 
          showEditorPanel={false} 
        />
      ) : (
        <div className='flex items-center justify-center h-screen bg-gray-900 text-gray-400'>
          <p>Project not found or not available for public viewing.</p>
        </div>
      )}
    </div>
  );
};

export default View;