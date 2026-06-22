import React, { useEffect, useState } from 'react'
import { assets } from '../assets/assets';
import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '@/lib/auth-client';
import { UserButton } from "@daveyplate/better-auth-ui";
import api from '@/config/Axios';
import { toast } from 'sonner';


const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [credits, setCredits] = useState(0);
    const navigate=useNavigate();

    const {data :session}=authClient.useSession();

    const getCredits=async()=>{
      try {
        const {data}=await api.get('/api/user/credits')
        setCredits(data.credits)
      } catch (error: any) {
        console.error("Error fetching credits:", error);
        toast.error(error?.response?.data?.message ||error.message)
      }
    }

    useEffect(()=>{
     if(session?.user){
      getCredits();
     }
    },[session?.user])

  return (
    <>
     <nav className="z-50 flex items-center justify-between w-full py-4 px-4 md:px-16 lg:px-24 xl:px-32 backdrop-blur border-b text-white border-slate-800/80">
        <Link to="/" className="hover:opacity-90 active:scale-95 transition-transform duration-300">
              <img src={assets.logo} alt='logo' className='h-5 sm:h-7'/>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="hover:text-indigo-400 hover:scale-105 transition-all duration-300 ease-out">Home</Link>
            <Link to="/projects" className="hover:text-indigo-400 hover:scale-105 transition-all duration-300 ease-out">My Projects</Link>
            <Link to="/community" className="hover:text-indigo-400 hover:scale-105 transition-all duration-300 ease-out">Community</Link>
            <Link to="/pricing" className="hover:text-indigo-400 hover:scale-105 transition-all duration-300 ease-out">Pricing</Link>
          </div>

          <div className="flex items-center gap-3">
            
           { !session?.user?(
             <button onClick={()=>navigate("/auth/signin")}
            className="px-6 py-1.5 max-sm:text-sm bg-gradient-to-r from-indigo-500 to-indigo-600 hover-interactive font-medium shadow-md shadow-indigo-500/10 rounded">
              Get started
            </button>
           ):(
          <>
          <button className="bg-gradient-to-br from-white/10 to-white/5 hover:border-indigo-500/50 hover:shadow-indigo-500/10 transition-all duration-300 px-5 py-1.5 text-xs sm:text-sm border border-white/10 text-gray-200 rounded-full cursor-default">
             Credits: <span className='text-indigo-300 font-semibold'>
              {credits}
             </span>
          </button>
             <div className="hover:scale-105 active:scale-95 transition-transform duration-300">
               <UserButton size='icon'/>
             </div>
             </>
           )
          
            }
            <button id="open-menu" className="md:hidden active:scale-90 transition" onClick={() => setMenuOpen(true)} >
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg>
          </button>
          </div>

          
        </nav>
           {/* Mobile Menu */}
        {menuOpen && (
          <div className="fixed inset-0 z-100 bg-black/60 text-white backdrop-blur flex flex-col items-center justify-center text-lg gap-8 md:hidden transition-transform duration-300">
            <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/projects" onClick={() => setMenuOpen(false)}>My Projects</Link>
            <Link to="/community" onClick={() => setMenuOpen(false)}>Community</Link>
            <Link to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>

            <button className="active:ring-3 active:ring-white aspect-square size-10 p-1 items-center justify-center bg-slate-100 hover:bg-slate-200 transition text-black rounded-md flex" onClick={() => setMenuOpen(false)} >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        )}
          {/* BACKGROUND IMAGE */}
          <img src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/refs/heads/main/assets/hero/bg-gradient-2.png" className="absolute inset-0 -z-10 size-full opacity" alt="" />

    </>
  )
}

export default Navbar
