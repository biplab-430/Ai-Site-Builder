import { Loader2Icon } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/config/Axios'

// FIX (LB-09): Replace blind 6-second redirect with active credit polling.
// After a Stripe checkout the webhook may take a few seconds to fire and credit
// the user. We store the baseline credit count before redirecting to Stripe
// (see Pricing.tsx) and poll here until the count increases, confirming that
// the webhook completed successfully. A 90-second safety timeout prevents
// infinite polling if the webhook is severely delayed.
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS  = 90_000;
const BASELINE_KEY     = 'credits_before_purchase';

const Loading = () => {
  const navigate = useNavigate();
  const [statusMsg, setStatusMsg] = useState('Confirming your payment…');

  useEffect(() => {
    const baseline = parseInt(sessionStorage.getItem(BASELINE_KEY) || '0', 10);
    let elapsed = 0;
    let done = false;

    const interval = setInterval(async () => {
      elapsed += POLL_INTERVAL_MS;

      try {
        const { data } = await api.get('/api/user/credits');
        const current: number = data.credits ?? 0;

        if (current > baseline) {
          // Credits increased — webhook confirmed, clean up and redirect.
          done = true;
          clearInterval(interval);
          sessionStorage.removeItem(BASELINE_KEY);
          navigate('/');
          return;
        }
      } catch {
        // Network hiccup — keep polling silently.
      }

      if (elapsed >= POLL_TIMEOUT_MS) {
        // Safety valve: stop polling and send the user home anyway.
        done = true;
        clearInterval(interval);
        sessionStorage.removeItem(BASELINE_KEY);
        setStatusMsg('Payment received! Credits may take a moment to appear.');
        setTimeout(() => navigate('/'), 2000);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (!done) clearInterval(interval);
    };
  }, [navigate]);

  return (
    <div className='h-screen flex flex-col items-center justify-center gap-4'>
      <Loader2Icon className='size-8 animate-spin text-indigo-400' />
      <p className='text-sm text-gray-400'>{statusMsg}</p>
    </div>
  );
};

export default Loading;
