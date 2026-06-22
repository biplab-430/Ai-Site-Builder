import { useState, useEffect } from 'react';
import type { Project } from "../types";
import { Loader2Icon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Footer from '../componenets/Footer';
import api from '@/config/Axios';
import { toast } from 'sonner';
import { authClient } from "@/lib/auth-client"; // <-- Import auth client

const Community = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();

  // <-- Add session check
  const { data: session, isPending } = authClient.useSession(); 

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/api/project/published');
      setProjects(data.projects || []);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to load community projects");
    } finally {
      setLoading(false);
    }
  };

  // <-- Auth Guard Effect
  useEffect(() => {
    if (!isPending && !session?.user) {
      toast.error("Please sign in to view the community");
      navigate("/");
    }
  }, [isPending, session, navigate]);

  // <-- Only fetch if user exists
  useEffect(() => {
    if (session?.user) {
      fetchProjects();
    }
  }, [session]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Loader2Icon className="size-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <>
      <div className="px-4 md:px-16 lg:px-24 xl:px-32 animate-fade-in-up">
        {loading ? (
          <div className="flex items-center justify-center h-[80vh]">
            <Loader2Icon className="size-7 animate-spin text-indigo-300" />
          </div>
        ) : projects.length > 0 ? (
          <div className="py-10 min-h-[80vh]">
            <div className="flex items-center justify-between mb-12">
              <h1 className="text-2xl font-medium text-white">Published Projects</h1>
            </div>

            <div className="flex flex-wrap gap-4">
              {projects.map((project) => (
                <Link 
                  key={project.id} 
                  to={`/view/${project.id}`}
                  target='_blank'
                  className="relative group w-72 max-sm:mx-auto cursor-pointer bg-gradient-to-br from-slate-900/85 via-gray-900/60 to-slate-950/85 border border-gray-800/80 rounded-lg overflow-hidden hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/15 hover:scale-105 hover:brightness-[1.03] active:scale-[0.98] transition-all duration-300 ease-out flex flex-col"
                >
                  <div className="relative w-full h-40 bg-gray-900 overflow-hidden border-b border-gray-800 shrink-0">
                    {project.current_code ? (
                      <iframe
                        srcDoc={project.current_code}
                        title="preview"
                        sandbox="allow-scripts allow-same-origin"
                        className="absolute top-0 left-0 w-[1200px] h-[800px] origin-top-left pointer-events-none"
                        style={{ transform: "scale(0.25)" }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                        No Preview Available
                      </div>
                    )}
                  </div>

                  <div className="p-4 text-white flex-1 flex flex-col bg-gradient-to-t from-gray-950 to-transparent group-hover:from-indigo-950/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <h2 className="text-lg font-medium line-clamp-2">{project.name}</h2>
                      <button className="px-2.5 py-0.5 mt-1 ml-2 text-[10px] bg-gray-800 border border-gray-700 rounded-full shrink-0 cursor-default">
                        Website
                      </button>
                    </div>
                    
                    <p className="text-gray-400 mt-2 text-sm line-clamp-2 flex-1">
                      {project.initial_prompt}
                    </p>
                    
                    <div className="flex justify-between items-center mt-6">
                      <span className="text-xs text-gray-500">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex gap-3 text-white text-sm mt-4">
                      <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] rounded-md transition-all flex items-center gap-2 w-full justify-center cursor-default">
                        <span className="bg-gray-200 size-5 rounded-full text-black font-semibold flex items-center justify-center text-xs">
                          {project.user?.name?.charAt(0).toUpperCase() || "U"}
                        </span>
                        <span className="truncate">
                          {project.user?.name || "Anonymous User"}
                        </span>
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[80vh]">
            <h1 className="text-3xl font-semibold text-gray-300">
              No published projects yet
            </h1>
            <p className="text-gray-500 mt-2">Be the first to publish a project to the community!</p>
            <button
              onClick={() => navigate("/")}
              className="text-white px-5 py-2 mt-6 rounded-md bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover-interactive font-medium shadow-lg shadow-indigo-500/20"
            >
              Create New Project
            </button>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Community;