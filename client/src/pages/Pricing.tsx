import React, { useState } from 'react'
import { appPlans } from '../assets/assets';
import Footer from '../componenets/Footer';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';
import api from '@/config/Axios';

interface Plan{
  id:string;
  name:string;
  price:string;
  credits:number;
  description:string;
  features:string[];
}

const Pricing = () => {

    const {data:session}=authClient.useSession()
  const [plans]=useState<Plan[]>(appPlans)

   const handlePurchase = async (planId:string) => {
        try {
            if(!session) return toast.error('Please log in to purchase credits');

            // Store the current credit balance as a baseline.
            // The /loading page polls until credits exceed this value,
            // confirming the Stripe webhook has completed successfully.
            try {
              const { data: creditData } = await api.get('/api/user/credits');
              sessionStorage.setItem('credits_before_purchase', String(creditData.credits ?? 0));
            } catch {
              sessionStorage.setItem('credits_before_purchase', '0');
            }

            const { data } = await api.post('/api/user/purchase-credits', { planId });
            window.location.assign(data.payment_link);

        } catch (error:any) {
             toast.error(error?.response?.data?.message || error.message);
             console.log(error)
        }
    }
  return (
    <>
    <div className="w-full max-w-5xl mx-auto z-20 max-md:px-4 min-h-[80vh] animate-fade-in-up">
      <div className='text-center mt-16'>
        <h2 className='text-gray-100 text-3xl font-medium'>Choose Your Plan</h2>
        <p className='text-gray-400 mt-2 text-sm max-w-md mx-auto'> start from free and select the plan that best fits your content creation</p>
      </div>
       <div className='pt-14 py-4 px-4 '>
                    <div className='grid grid-cols-1 md:grid-cols-3 flex-wrap gap-4'>
                        {plans.map((plan, idx) => (
                            <div key={idx} className="p-6 bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-slate-950/80 border border-indigo-950/80 hover:border-indigo-500 hover:shadow-indigo-500/10 hover:scale-105 hover:brightness-[1.03] active:scale-[0.98] mx-auto w-full max-w-sm rounded-xl text-white shadow-lg transition-all duration-300 ease-out">
                                <h3 className="text-xl font-bold">{plan.name}</h3>
                                <div className="my-2">
                                    <span className="text-4xl font-bold">{plan.price}</span>
                                    <span className="text-gray-300"> / {plan.credits} credits</span>
                                </div>

                                <p className="text-gray-300 mb-6">{plan.description}</p>

                                <ul className="space-y-1.5 mb-6 text-sm">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center">
                                            <svg className="h-5 w-5 text-indigo-300 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-gray-400">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => handlePurchase(plan.id)} className="w-full py-2 px-4 bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover-interactive text-sm font-medium rounded-md shadow-md shadow-indigo-500/10">
                                    Buy Now
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
                <p className='mx-auto text-center text-sm max-w-md mt-10 text-white/60  font-light'>project <span className='text-white'>Creation/Revision</span> consume
                <span className='text-white'>5 Credits</span>.you can purchase more credits to create more Projects</p>
    </div>
    <Footer/>
    </>
  )
}

export default Pricing
