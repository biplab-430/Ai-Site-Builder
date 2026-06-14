import React, { useState, useEffect } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number; // Milliseconds per character
}

const Typewriter: React.FC<TypewriterProps> = ({ text, speed = 20 }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    // Reset displayed text if the text prop changes
    setDisplayedText(""); 
    let i = 0;

    const typingInterval = setInterval(() => {
      if (i < text.length) {
        // Use the callback form of setDisplayedText to ensure accuracy
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, speed);

    // Cleanup interval on unmount
    return () => clearInterval(typingInterval);
  }, [text, speed]);

  return (
    <span>
      {displayedText}
      {/* Optional blinking cursor effect */}
      <span className="animate-pulse border-r-2 border-indigo-500 ml-1"></span>
    </span>
  );
};

export default Typewriter;