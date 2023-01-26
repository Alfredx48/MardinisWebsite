import React from "react";
import "../css/hompage.css"
import { motion } from "framer-motion";

function HomePage({ currentUser }) {
  return (
    <motion.div
      className="home"
      initial={{ scale: 0.5, opacity: 0, x: "-50%", y: "-50%" }}
      animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 700,
        damping: 200,
        delay: 0.5
      }}
    >
      {/* {!currentUser ? null : `Welcome ${currentUser.name}`} */}
    </motion.div>
  );
}

export default HomePage;
