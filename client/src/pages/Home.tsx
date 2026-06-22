import Loaderstep from '@/componenets/Loaderstep';
import api from '@/config/Axios';
import { authClient } from '@/lib/auth-client';

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// 1. IMPORT YOUR LOADER (Adjust path if needed)
; 

const Home = () => {
  const [input, setInput] = useState("");
  const [Loading, setLoading] = useState(false);
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const onSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user) {
      return toast.error("please sign in to create a project");
    } else if (!input.trim()) {
      return toast.error("please enter a message");
    }

    try {
      // Start the full-screen loader
      setLoading(true);
      
      const { data } = await api.post(`/api/user/project`, {
        initial_prompt: input
      });
       
      toast.success("Project created successfully");
      navigate(`/projects/${data.projectId}`);
      
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create project");
    } finally {
      // 2. CRITICAL FIX: Put setLoading(false) in a finally block!
      // This ensures the loader turns off even if the API throws an error.
      setLoading(false); 
    }
  };

  // 3. THE CONDITIONAL RENDER
  // If Loading is true, hijack the screen and show ONLY the Loaderstep
  if (Loading) {
    return (
      <div className="fixed inset-0 z-50 h-screen w-screen">
        <Loaderstep />
      </div>
    );
  }

  // If Loading is false, return your normal UI
  return (
    <section className="flex flex-col items-center text-white text-sm pb-20 px-4 font-poppins animate-fade-in-up">
      <h1 className="text-center text-[40px] leading-12 md:text-6xl md:leading-[70px] mt-4 font-semibold max-w-3xl bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
        Turn thoughts into Websites Instantly, With AI
      </h1>

      <p className="text-center text-base max-w-md mt-2 text-gray-300">
        Customise and Publish Website Faster Than Ever with Our AI-Site Builder
      </p>

      <form onSubmit={onSubmitHandler} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md max-w-2xl w-full rounded-xl p-4 mt-10 border border-indigo-500/40 hover:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500 transition-all duration-300 shadow-xl hover:shadow-indigo-500/10">
        <textarea 
          onChange={e => setInput(e.target.value)} 
          className="bg-transparent outline-none text-gray-300 resize-none w-full" 
          rows={4} 
          placeholder="Describe your presentation in details" 
          required 
        />
        <button className="ml-auto flex items-center gap-2 bg-gradient-to-r from-[#CB52D4] to-indigo-600 rounded-md px-4 py-2 hover-interactive shadow-lg shadow-indigo-500/20 font-medium">
          Create with AI
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-16 md:gap-20 mx-auto mt-16">
         {/* Logos or other content */}
      </div>
    </section>
  )
}

export default Home;