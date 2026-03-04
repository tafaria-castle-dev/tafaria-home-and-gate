"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Users } from "lucide-react";

export default function PaxAdult() {
  const [adults, setAdults] = useState(1); // Minimum 1 adult

  const increment = () => setAdults((prev) => prev + 1);
  const decrement = () => setAdults((prev) => (prev > 1 ? prev - 1 : 1));

  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-lg  outline border-gray-200 w-64">
      {/* Icon */}
      <Users className="w-6 h-6 text-gray-700" />

      {/* Counter */}
      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={decrement}
          className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"
        >
          <Minus className="w-5 h-5 text-gray-700" />
        </motion.button>

        <span className="text-lg font-semibold text-gray-800">{adults}</span>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={increment}
          className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"
        >
          <Plus className="w-5 h-5 text-gray-700" />
        </motion.button>
      </div>
    </div>
  );
}
