"use client";

import { motion } from "framer-motion";
import PackagesForm from "./Post";

export default function Settings() {

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white shadow-md rounded-lg p-6"
    >
      <h2 className="text-2xl font-semibold text-gray-800">Settings</h2>
      
      <p className="text-gray-600 mt-2">Here you can view setups, packages, and more!</p>

      

<PackagesForm/>
 
    </motion.div>
  );
}
