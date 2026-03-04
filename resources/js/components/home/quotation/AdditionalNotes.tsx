import { ChangeEvent } from 'react';

interface AdditionalNotesProps {
    value: string;
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

const AdditionalNotes: React.FC<AdditionalNotesProps> = ({ value, onChange }) => {
    const formatValue = (text: string) => {
        return text?.replace(/\\n/g, '\n')?.replace(/\\t/g, '\t');
    };
    return (
        <div className="w-full p-4">
            <div className="w-full">
                <textarea
                    value={formatValue(value)}
                    onChange={onChange}
                    disabled
                    placeholder="Additional Notes"
                    className="w-full rounded-md border p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    rows={4}
                />
            </div>
        </div>
    );
};

export default AdditionalNotes;
