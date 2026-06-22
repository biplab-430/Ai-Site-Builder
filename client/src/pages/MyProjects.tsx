import React, { useEffect, useState } from "react";
import type { Project } from "../types";
import { Loader2Icon, PlusIcon, TrashIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Footer from "../componenets/Footer";
import api from "@/config/Axios";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MyProjects: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const { data } = await api.get("/api/user/projects");
      setProjects(data.projects || []);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { data } = await api.delete(`/api/project/delete/${projectId}`);

      toast.success(data.message);

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to delete project");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <>
      <div className="px-4 md:px-16 lg:px-24 xl:px-32 animate-fade-in-up">
        {loading ? (
          <div className="flex items-center justify-center h-[80vh]">
            <Loader2Icon className="size-7 animate-spin text-indigo-300" />
          </div>
        ) : projects.length > 0 ? (
          <div className="py-10 min-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between mb-12">
              <h1 className="text-2xl font-medium text-white">
                My Projects
              </h1>

              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded
                 bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600
                 hover-interactive shadow-lg shadow-indigo-500/20 font-medium"
              >
                <PlusIcon size={18} />
                Create New
              </button>
            </div>

            {/* Projects Grid */}
            <div className="flex flex-wrap gap-4">
              {projects.map((project) => (
                <div
                  onClick={() => navigate(`/projects/${project.id}`)}
                  key={project.id}
                  className="relative group w-72 max-sm:mx-auto cursor-pointer
                  bg-gradient-to-br from-slate-900/85 via-gray-900/60 to-slate-950/85 border border-gray-800/80 rounded-lg overflow-hidden
                  shadow-md hover:shadow-indigo-500/15 hover:border-indigo-500/50 hover:scale-105 hover:brightness-[1.03] active:scale-[0.98]
                  transition-all duration-300 ease-out"
                >
                  {/* Preview */}
                  <div className="relative w-full h-40 bg-gray-900 overflow-hidden border-b border-gray-800">
                    {project.current_code ? (
                      <iframe
                        srcDoc={project.current_code}
                        title="preview"
                        sandbox="allow-scripts allow-same-origin"
                        className="absolute top-0 left-0 w-[1200px] h-[800px] origin-top-left pointer-events-none"
                        style={{ transform: "scale(0.25)" }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <h1 className="text-xl font-semibold text-gray-300 text-center px-2">
                          Generating...
                        </h1>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 text-white bg-gradient-to-t from-gray-950 to-transparent group-hover:from-indigo-950/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <h2 className="text-lg font-medium line-clamp-2">
                        {project.name}
                      </h2>

                      <button className="px-2.5 py-0.5 mt-1 ml-2 text-[10px] bg-gray-800 border border-gray-700 rounded-full cursor-default">
                        Website
                      </button>
                    </div>

                    <p className="text-gray-400 mt-1 text-sm line-clamp-2">
                      {project.initial_prompt}
                    </p>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex justify-between items-center mt-6"
                    >
                      <span className="text-xs text-gray-500">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-3 text-white text-sm mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/preview/${project.id}`);
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95 rounded-md transition-all flex items-center gap-2 font-medium"
                      >
                        Preview
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${project.id}`);
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95 rounded-md transition-all flex items-center gap-2 font-medium"
                      >
                        Open In Chat
                      </button>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <TrashIcon
                      className="absolute top-3 right-3 scale-0 group-hover:scale-100 bg-white p-1.5 size-7 rounded text-red-500 cursor-pointer transition-all shadow-lg hover:bg-red-50"
                      onClick={() => setDeleteProjectId(project.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[80vh]">
            <h1 className="text-3xl font-semibold text-gray-300">
              You have no projects yet
            </h1>

            <button
              onClick={() => navigate("/")}
              className="text-white px-5 py-2 mt-5 rounded-md bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover-interactive font-medium shadow-lg shadow-indigo-500/20"
            >
              Create New
            </button>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deleteProjectId}
        onOpenChange={(open) => {
          if (!open) setDeleteProjectId(null);
        }}
      >
        <AlertDialogContent className="bg-gray-950 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>

            <AlertDialogDescription className="text-gray-400">
              This action cannot be undone. The project and all related
              data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteProjectId(null)}
              className="bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteProjectId) {
                  deleteProject(deleteProjectId);
                  setDeleteProjectId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </>
  );
};

export default MyProjects;