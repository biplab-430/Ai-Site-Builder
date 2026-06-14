import { Link } from "react-router-dom";
import type { Message, Project, Version } from "../types";
import {
  BotIcon,
  EyeIcon,
  Loader2Icon,
  SendIcon,
  UserIcon,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
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
import Typewriter from './Typewriter';

interface SidebarProps {
  isMenuOpen: boolean;
  project: Project;
  setProject: (project: Project) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
}

const Sidebar = ({
  isMenuOpen,
  project,
  setProject,
  isGenerating,
  setIsGenerating,
}: SidebarProps) => {
  const messageRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");
  const [rollbackVersionId, setRollbackVersionId] = useState<string | null>(
    null
  );

  const fetchProject = async () => {
    try {
      const { data } = await api.get(
        `/api/user/project/${project.id}`
      );

      setProject(data.project);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to fetch project"
      );
      console.error(error);
    }
  };

  const handleRollBack = async (
    versionId: string
  ) => {
    try {
      setIsGenerating(true);

      const { data } = await api.put(
        `/api/project/rollback/${project.id}/${versionId}`
      );

      await fetchProject();

      toast.success(data.message);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to rollback version"
      );
      console.error(error);
    } finally {
      setIsGenerating(false);
      setRollbackVersionId(null);
    }
  };

  const handleRevision = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const prompt = input.trim();

    if (!prompt) {
      toast.error(
        "Please enter a valid revision request"
      );
      return;
    }

    let interval: NodeJS.Timeout | undefined;

    try {
      setIsGenerating(true);

      interval = setInterval(async () => {
        await fetchProject();
      }, 10000);

      const { data } = await api.post(
        `/api/project/revision/${project.id}`,
        {
          message: prompt,
        }
      );

      await fetchProject();

      toast.success(data.message);

      setInput("");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to create revision"
      );
      console.error(error);
    } finally {
      if (interval) {
        clearInterval(interval);
      }

      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [project.conversation.length, isGenerating]);

  return (
    <>
      <div
        className={`h-full sm:max-w-sm rounded-xl bg-gray-900 border border-gray-800 transition-all ${
          isMenuOpen
            ? "max-sm:w-0 overflow-hidden"
            : "w-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-3 flex flex-col gap-4">
            {[...project.conversation, ...project.versions]
              .sort(
                (a, b) =>
                  new Date(a.timestamp).getTime() -
                  new Date(b.timestamp).getTime()
              )
              .map((message, index, array) => {
                const isMessage = "content" in message;
                const isLastItem = index === array.length - 1;

                if (isMessage) {
                  const msg = message as Message;
                  const isUser = msg.role === "user";

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${
                        isUser
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shrink-0">
                          <BotIcon className="size-5 text-white" />
                        </div>
                      )}

                      <div
                        className={`${
                          isUser
                            ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-tr-none"
                            : "bg-gray-800 text-gray-100 rounded-tl-none"
                        } max-w-[80%] p-3 px-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap`}
                      >
                        {!isUser ? (
                          <Typewriter 
                            text={msg.content} 
                            speed={isLastItem ? 25 : 0} 
                          />
                        ) : (
                          msg.content
                        )}
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                          <UserIcon className="size-5 text-gray-200" />
                        </div>
                      )}
                    </div>
                  );
                }

                const ver = message as Version;

                return (
                  <div
                    key={ver.id}
                    className="w-4/5 mx-auto my-2 p-3 rounded-xl bg-gray-800 text-gray-100 shadow flex flex-col gap-2"
                  >
                    <div className="text-xs font-medium">
                      Code Update
                      <br />
                      <span className="text-gray-500 text-xs font-normal">
                        {new Date(
                          ver.timestamp
                        ).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      {project.current_version_index ===
                      ver.id ? (
                        <button className="px-3 py-1 rounded-md text-xs bg-gray-700 cursor-default">
                          Current Version
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setRollbackVersionId(
                              ver.id
                            )
                          }
                          disabled={isGenerating}
                          className="px-3 py-1 rounded-md text-xs bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50"
                        >
                          Roll Back
                        </button>
                      )}

                      <Link
                        target="_blank"
                        to={`/preview/${project.id}/${ver.id}`}
                      >
                        <EyeIcon className="size-6 p-1 bg-gray-700 hover:bg-indigo-500 transition-colors rounded" />
                      </Link>
                    </div>
                  </div>
                );
              })}

            {isGenerating && (
              <div className="flex items-start gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shrink-0">
                  <BotIcon className="size-5 text-white" />
                </div>

                <div className="flex gap-1.5 items-end">
                  <span
                    className="size-2 rounded-full animate-bounce bg-gray-500"
                    style={{
                      animationDelay: "0s",
                    }}
                  />
                  <span
                    className="size-2 rounded-full animate-bounce bg-gray-500"
                    style={{
                      animationDelay: "0.2s",
                    }}
                  />
                  <span
                    className="size-2 rounded-full animate-bounce bg-gray-500"
                    style={{
                      animationDelay: "0.4s",
                    }}
                  />
                </div>
              </div>
            )}

            <div ref={messageRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleRevision}
            className="m-3 relative"
          >
            <div className="flex items-center gap-2">
              <textarea
                rows={4}
                value={input}
                onChange={(e) =>
                  setInput(e.target.value)
                }
                placeholder="Describe your website changes..."
                disabled={isGenerating}
                className="flex-1 p-3 rounded-xl resize-none text-sm outline-none ring ring-gray-700 focus:ring-indigo-500 bg-gray-800 text-gray-100 placeholder:text-gray-400 transition-all"
              />

              <button
                type="submit"
                disabled={
                  isGenerating ||
                  !input.trim()
                }
                className="absolute bottom-2.5 right-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white transition-colors disabled:opacity-60"
              >
                {isGenerating ? (
                  <Loader2Icon className="size-7 p-1.5 animate-spin text-white" />
                ) : (
                  <SendIcon className="size-7 p-1.5 text-white" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Rollback Confirmation Dialog */}
      <AlertDialog
        open={!!rollbackVersionId}
        onOpenChange={(open) => {
          if (!open) {
            setRollbackVersionId(null);
          }
        }}
      >
        <AlertDialogContent className="bg-gray-900 border border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Roll back project?
            </AlertDialogTitle>

            <AlertDialogDescription className="text-gray-400">
              This will restore your project to the
              selected version. Any newer changes
              will no longer be the active version.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                if (rollbackVersionId) {
                  handleRollBack(
                    rollbackVersionId
                  );
                }
              }}
            >
              Roll Back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Sidebar;