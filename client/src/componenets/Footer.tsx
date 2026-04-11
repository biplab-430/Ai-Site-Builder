import React from "react";

const Footer = () => {
  return (
    <footer className="mt-24 border-t border-gray-800 py-4 text-center text-sm text-gray-400">
      <p>
        © {new Date().getFullYear()} Ai Website Builder-Biplab All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
