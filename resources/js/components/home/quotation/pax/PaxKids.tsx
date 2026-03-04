"use client";

import { motion } from "framer-motion";
import { Minus, Plus, Baby } from "lucide-react";

interface Kid {
  id: number;
  age: number;
}
interface PaxKidsProps {
  kids: Kid[];
  setKids: (kids: Kid[]) => void;
}
export default function PaxKids({ kids = [], setKids }: PaxKidsProps) {
  const addKid = () => {
    setKids([...kids, { id: kids.length + 1, age: 0 }]); // Default age is 12
  };

  const removeKid = () => {
    setKids(kids.slice(0, -1));
  };

  const updateAge = (id: number, age: number) => {
    setKids(kids.map((kid) => (kid.id === id ? { ...kid, age } : kid)));
  };

  return (
    <div className="bg-white p-4 rounded-lg w-full outline flex items-center gap-6">
      {/* Selector */}
      <div className="flex items-center bg-white rounded-lg w-64">
        {/* Icon */}
        <Baby className="w-6 h-6 text-gray-700 mr-4" />

        {/* Counter */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={removeKid}
            className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"
          >
            <Minus className="w-5 h-5 text-gray-700" />
          </motion.button>

          <span className="text-lg font-semibold text-gray-800">
            {kids.length ?? 0}
          </span>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={addKid}
            className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"
          >
            <Plus className="w-5 h-5 text-gray-700" />
          </motion.button>
        </div>
      </div>

      {/* List of Kids with Age Selection */}
      <div className="flex flex-wrap gap-4 mt-0">
        {kids.map((kid) => (
          <motion.div
            key={kid.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="p-3 border rounded-lg flex items-center gap-3 text-sm"
          >
            <span className="text-gray-700">Kid {kid.id}</span>
            <select
              value={kid.age}
              onChange={(e) => updateAge(kid.id, parseInt(e.target.value))}
              className="border p-2 rounded-lg text-gray-800 text-sm"
            >
              {[...Array(12).keys()].map((age) => (
                <option key={age} value={age}>
                  {age} {age === 1 ? "year" : "years"}
                </option>
              ))}
            </select>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
