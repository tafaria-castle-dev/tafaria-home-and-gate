import { motion } from 'framer-motion';
import { Eye, FileText, MoreVertical, Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const InvoiceActionsDropdown = ({ quotation, onViewPDF, onEdit }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (action: string) => {
        setIsOpen(false);
        switch (action) {
            case 'proforma':
                // Generate proforma logic
                break;
            case 'final':
                // Generate final invoice logic
                break;
            case 'view':
                onViewPDF(quotation.quotation_details);
                break;
            case 'edit':
                onEdit(quotation);
                break;
            default:
                break;
        }
    };

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-full p-2 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                aria-label="More actions"
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="ring-opacity-5 absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black"
                >
                    <div className="py-1">
                        <button
                            onClick={() => handleAction('view')}
                            className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        >
                            <Eye className="mr-3 h-4 w-4 text-blue-500" />
                            View Quotation
                        </button>
                        <button
                            onClick={() => handleAction('edit')}
                            className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        >
                            <Pencil className="mr-3 h-4 w-4 text-green-500" />
                            Edit Quotation
                        </button>
                        <div className="border-t border-gray-100"></div>
                        <button
                            onClick={() => handleAction('proforma')}
                            className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        >
                            <FileText className="mr-3 h-4 w-4 text-purple-500" />
                            Generate Proforma
                        </button>
                        <button
                            onClick={() => handleAction('final')}
                            className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        >
                            <FileText className="mr-3 h-4 w-4 text-orange-500" />
                            Generate Final Invoice
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default InvoiceActionsDropdown;
