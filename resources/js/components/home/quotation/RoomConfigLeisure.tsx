import { useState } from 'react';
const roomdetails = [
    {
        type: 'Single',
        amount_ksh: '16000',
        categories: [
            { name: 'Superior', description: 'Lords Room', amount_ksh: 5000 },
            { name: 'Superior', description: 'Chamber', amount_ksh: 5000 },
            { name: 'Executive', description: "Lord's Court Executive", amount_ksh: 5000 },
            { name: 'Deluxe', description: 'Lost Knights,Damsel Plus & enclave Quarters Room', amount_ksh: 5000 },
            { name: 'Standard', description: 'Knights,Damsels & Vikings Quarter & Manor House ', amount_ksh: 5000 },
        ],
    },
    {
        type: 'Double',
        amount_ksh: '12000',
        categories: [
            { name: 'Superior', description: 'Lords Room', amount_ksh: 5000 },
            { name: 'Superior', description: 'Chamber', amount_ksh: 5000 },
            { name: 'Executive', description: "Lord's Court Executive", amount_ksh: 5000 },
            { name: 'Deluxe', description: 'Lost Knights,Damsel Plus & enclave Quarters Room', amount_ksh: 5000 },
            { name: 'Standard', description: 'Knights,Damsels & Vikings Quarter & Manor House ', amount_ksh: 5000 },
        ],
    },
    {
        type: 'Triple',
        amount_ksh: '9000',
        categories: [
            { name: 'Executive', description: "Lord's Court Executive", amount_ksh: 5000 },
            { name: 'Deluxe', description: 'Lost Knights,Damsel Plus & enclave Quarters Room', amount_ksh: 5000 },
            { name: 'Standard', description: 'Knights,Damsels & Vikings Quarter & Manor House ', amount_ksh: 5000 },
        ],
    },
    {
        type: 'Quadra',
        amount_ksh: '8000',
        categories: [
            { name: 'Executive', description: "Lord's Court Executive", amount_ksh: 5000 },
            { name: 'Deluxe', description: 'Lost Knights,Damsel Plus & enclave Quarters Room', amount_ksh: 5000 },
            { name: 'Standard', description: 'Knights,Damsels & Vikings Quarter & Manor House ', amount_ksh: 5000 },
        ],
    },
];

export { roomdetails };

interface Category {
    name: string;
    description: string;
    amount_ksh: number;
}

interface Room {
    type: string;
    amount_ksh: string;
    categories: Category[];
}

const RoomConfigLeisure = ({
    type,
    numNights,
    activeTab,
    onClose,
    onUpdate,
}: {
    type: string;
    numNights: number;
    activeTab: string;
    onClose: () => void;
    onUpdate?: (selections: Array<{ name: string; description: string; amount_ksh: number; pax: number; total: number }>) => void;
}) => {
    const selectedRoom: Room | undefined = roomdetails.find((room) => room.type === type);

    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [pax, setPax] = useState<number>(1);
    const [selections, setSelections] = useState<Array<{ name: string; description: string; amount_ksh: number; pax: number; total: number }>>([]);

    const addSelection = () => {
        if (selectedCategory) {
            const existingIndex = selections.findIndex((selection) => selection.name === selectedCategory.name);
            const newSelections = [...selections];
            if (existingIndex !== -1) {
                newSelections[existingIndex] = {
                    ...selectedCategory,
                    pax,
                    total: selectedCategory.amount_ksh * pax * numNights,
                };
            } else {
                newSelections.push({
                    ...selectedCategory,
                    pax,
                    total: selectedCategory.amount_ksh * pax * numNights,
                });
            }
            setSelections(newSelections);
            if (onUpdate) onUpdate(newSelections);
            setSelectedCategory(null);
            setPax(1);
        }
    };

    const removeSelection = (index: number) => {
        const newSelections = selections.filter((_, i) => i !== index);
        setSelections(newSelections);
        if (onUpdate) onUpdate(newSelections);
    };

    const confirmSelections = () => {
        if (onUpdate) onUpdate(selections);
        onClose();
    };

    const totalAmount = selections.reduce((sum, item) => sum + item.total, 0);

    return (
        <div className="rounded border p-4">
            <h2 className="text-lg font-bold">Room Type: {type}</h2>
            <button onClick={onClose} className="float-right text-red-500">
                Close
            </button>
            <div>
                <label className="mt-2 block">Select Category:</label>
                <select
                    value={selectedCategory ? JSON.stringify(selectedCategory) : ''}
                    onChange={(e) => setSelectedCategory(JSON.parse(e.target.value))}
                    className="w-full rounded border p-2"
                >
                    <option value="">-- Select a Category --</option>
                    {selectedRoom?.categories.map((category, index) => (
                        <option key={index} value={JSON.stringify(category)}>
                            {category.name} - {category.description} ({category.amount_ksh} Ksh)
                        </option>
                    ))}
                </select>
            </div>
            <div className="mt-2">
                <label className="block">Number of Room:</label>
                <input type="number" value={pax} onChange={(e) => setPax(Number(e.target.value))} min="1" className="w-full rounded border p-2" />
            </div>
            <button onClick={addSelection} className="mt-2 rounded bg-blue-500 px-4 py-2 text-white">
                Add
            </button>
            <div className="mt-4">
                <h3 className="font-bold">Selected Items</h3>
                {selections.map((selection, i) => (
                    <div key={i} className="mt-2 flex items-center justify-between rounded bg-gray-100 p-2">
                        <span>
                            {selection.name} - {selection.description} ({selection.amount_ksh} Ksh) x {selection.pax} pax x {numNights} nights ={' '}
                            {selection.total} Ksh
                        </span>
                        <button onClick={() => removeSelection(i)} className="text-red-500">
                            Remove
                        </button>
                    </div>
                ))}
            </div>
            <h3 className="mt-4 font-bold">Total: {totalAmount} Ksh</h3>
            <button onClick={confirmSelections} className="mt-2 w-full rounded bg-green-500 px-4 py-2 text-white">
                Confirm Selection
            </button>
        </div>
    );
};

export default RoomConfigLeisure;
