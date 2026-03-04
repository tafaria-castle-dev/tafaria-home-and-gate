"use client";

import { motion } from "framer-motion";
import { Minus, Plus, Users } from "lucide-react";
interface PaxAdultProps {
  selectedType: string;
  adults: number;
  setAdults: (value: number) => void; // Fix: Allow function updater
}
export default function PaxAdult({
  selectedType,
  adults,
  setAdults,
}: PaxAdultProps) {
  const increment = () => {
    const newvalue = parseInt(String(adults)) + 1;
    setAdults(newvalue);
  };
  const decrement = () => setAdults(adults + 1 > 1 ? adults - 1 : 1);

  return (
    <>
      {selectedType === "Corporate" ? (
        <div className="w-full">
          <label className="block mb-2 text-sm text-gray-600">
            Number of Adults
          </label>
  
<input
  type="number"
  name="numNights"
  value={adults}
  onChange={(e) => {
    const value = parseInt(e.target.value, 10); // Fix: radix 10
    setAdults(isNaN(value) ? 1 : Math.max(1, value)); // Default to 1 if empty/NaN
  }}
  min="1" // Ensures arrows don't go below 1
  className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-5"
/>
        </div>
      ) : (
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

            <span className="text-lg font-semibold text-gray-800">
              {adults}
            </span>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={increment}
              className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"
            >
              <Plus className="w-5 h-5 text-gray-700" />
            </motion.button>
          </div>
        </div>
      )}
    </>
  );
}
