import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Project } from '../types';
import { ArrowBigDownDashIcon, EyeIcon, EyeOffIcon, Fullscreen, Laptop, Loader2Icon, MessageSquareIcon, SaveIcon, SmartphoneIcon, Tablet, XIcon } from 'lucide-react';

import Sidebar from '../componenets/Sidebar';
import ProjectPreview, { type ProjectPreviewRef } from '../componenets/ProjectPreview';
import api from '@/config/Axios';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';

const Projects = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const [isGenerating, setIsGenerating] = useState(true);
  const [device, setDevice] = useState<"phone" | "desktop" | "tablet">("desktop");

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const previewRef = useRef<ProjectPreviewRef>(null);

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/api/user/project/${projectId}`);
      setProject(data?.project);
      setIsGenerating(data?.project?.current_code ? false : true);
      setLoading(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch project");
      console.log(error);
    }
  };

  const togglePublish = async () => {
    try {
      // Kept as PUT based on your setup
      const { data } = await api.put(`/api/user/publish-toggle/${projectId}`);
      toast.success(data.message);
      setProject((prev) => prev ? ({ ...prev, isPublished: !prev.isPublished }) : null);
    } catch (error: any) {
      toast.error("Failed to save project");
    }
  };

  const downloadCode = () => {
    // Kept as getcode() based on your setup
    const code = previewRef.current?.getcode() || project?.current_code;
    if (!code) {
      if (isGenerating) {
        return;
      }
      return;
    }
    const element = document.createElement('a');
    const file = new Blob([code], { type: "text/html" });
    element.href = URL.createObjectURL(file);
    element.download = `index.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element); 
  };

  const saveProject = async () => {
    if (!previewRef.current) return;

    // Kept as getcode() based on your setup
    const code = previewRef.current.getcode(); 
    if (!code) return;

    setIsSaving(true);
    try {
      const { data } = await api.put(`/api/project/save/${projectId}`, {
        code
      });
      toast.success(data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchProject();
    } else if (!isPending && !session?.user) {
      navigate('/');
      toast('please sign in to view your projects');
    }
  }, [session, isPending, navigate]);

  useEffect(() => {
    if (project && !project.current_code) {
      const intervalId = setInterval(async () => {
        await fetchProject();
      }, 10000);
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [project]);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-screen">
          <Loader2Icon className='size-7 animate-spin text-violet-200' />
        </div>
      </>
    );
  }

  return project ? (
    <div className='flex flex-col h-screen w-full bg-gray-900 text-white'>
      <div className='flex max-sm:flex-col sm:items-center gap-4 px-4 py-2 no-scrollbar'>
        {/* left */}
        <div className='flex items-center gap-2 sm:min-w-90 text-nowrap'>
          <img src="/favicon.svg" alt="logo" className='h-6 cursor-pointer' onClick={() => navigate("/")} />
          <div className='max-w-64 sm:max-w-xs'>
            <p className='text-sm text-medium capitalize truncate'>{project.name} </p>
            {/* UI FIX: Corrected spelling to Previewing */}
            <p className='text-xs text-gray-400 -mt-0.5'> Previewing Last Saved Version</p>
          </div>
          <div className='sm:hidden flex-1 flex justify-end'>
            {/* UI FIX: Flipped icon logic so X shows when menu is open */}
            {isMenuOpen ? (
              <XIcon onClick={() => setIsMenuOpen(false)} className='size-6 cursor-pointer' />
            ) : (
              <MessageSquareIcon onClick={() => setIsMenuOpen(true)} className='size-6 cursor-pointer' />
            )}
          </div>
        </div>
        {/* middle */}
        <div className='hidden sm:flex gap-2 bg-gray-950 p-1.5 rounded-md border border-slate-800/80'>
          <SmartphoneIcon onClick={() => setDevice('phone')} className={`size-6 p-1 rounded cursor-pointer transition-all hover:scale-105 active:scale-95 ${device === 'phone' ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`} />
          <Tablet onClick={() => setDevice('tablet')} className={`size-6 p-1 rounded cursor-pointer transition-all hover:scale-105 active:scale-95 ${device === 'tablet' ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`} />
          <Laptop onClick={() => setDevice('desktop')} className={`size-6 p-1 rounded cursor-pointer transition-all hover:scale-105 active:scale-95 ${device === 'desktop' ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`} />
        </div>
        {/* right */}
        <div className='flex items-center justify-end gap-3 flex-1 text-xs sm:text-sm'>
          <button onClick={saveProject} disabled={isSaving} className='max-sm:hidden bg-gray-850 hover:bg-gray-800 hover:border-gray-500 hover:scale-105 active:scale-95 text-white px-3.5 py-1 flex items-center gap-2 rounded sm:rounded-sm transition-all border border-gray-700'>
            {isSaving ? <Loader2Icon className='animate-spin' size={16} /> : <SaveIcon size={16} />}  Save
          </button>
          
          <Link target='_blank' to={`/preview/${projectId}`} className='flex items-center gap-2 px-4 py-1 rounded sm:rounded-sm border border-gray-700 hover:border-gray-500 hover:scale-105 active:scale-95 transition-all text-gray-300 hover:text-white'>
            <Fullscreen size={16} />  Preview
          </Link>

          <button onClick={downloadCode} className='bg-gradient-to-r from-blue-600 to-indigo-600 hover-interactive text-white px-3.5 py-1 flex items-center gap-2 rounded sm:rounded-sm transition-all shadow-md shadow-blue-500/10 font-medium'>
            <ArrowBigDownDashIcon size={16} />  Download
          </button>

          <button onClick={togglePublish} className='bg-gradient-to-r from-[#CB52D4] to-indigo-600 hover-interactive text-white px-3.5 py-1 flex items-center gap-2 rounded sm:rounded-sm transition-all shadow-md shadow-indigo-500/10 font-medium'>
            {project.isPublished ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            {project.isPublished ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>
      {/* content */}
      <div className='flex-1 flex overflow-auto'>
        <Sidebar isMenuOpen={isMenuOpen} project={project} setProject={(p) => setProject(p)} isGenerating={isGenerating} setIsGenerating={setIsGenerating} />
        <div className='flex-1 p-2 pl-0'>
          <ProjectPreview ref={previewRef} project={project} isGenerating={isGenerating} device={device} />
        </div>
      </div>
    </div>
  ) : (
    <div className='flex items-center justify-center h-screen'>
      <p className='text-2xl font-medium text-gray-200'>Unable to Load project</p>
    </div>
  );
};

export default Projects;