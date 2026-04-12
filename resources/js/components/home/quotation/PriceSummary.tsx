/* eslint-disable @typescript-eslint/no-explicit-any */

const PriceSummary = ({ selectedRooms, onDeleteRoom }: { selectedRooms: any[]; onDeleteRoom?: (roomId: string) => void }) => {
    const totalRooms = selectedRooms.reduce((sum, room) => sum + (room.rooms || 0), 0);

    const totalAmount = selectedRooms.reduce(
        (sum, room) => sum + (1 - (room.selectedDiscount || 0) / 100) * (room.total - (room.holidaySupplement ?? 0)) + (room.holidaySupplement ?? 0),
        0,
    );

    const totalPax = selectedRooms.reduce((sum, room) => {
        return sum + (room.pax || 0);
    }, 0);

    return (
        <div className="mt-4 rounded-lg bg-white p-4 text-gray-800 shadow-md dark:text-white">
            {selectedRooms.length === 0 ? (
                <p className="py-4 text-center text-gray-500">No rooms selected</p>
            ) : (
                <>
                    <div className="space-y-3">
                        {selectedRooms.map((room, index) => (
                            <div
                                key={room.id || index}
                                className="flex flex-col rounded-md border-b border-gray-200 px-2 py-2 text-sm transition-colors hover:bg-gray-50"
                            >
                                <div className="mb-2 flex-1">
                                    <span className="font-medium">
                                        {room.rooms} {room.room_type}
                                    </span>
                                    <span className="text-gray-600"> {room.board_type}</span>
                                    <span className="ml-2">
                                        – KES{' '}
                                        {(
                                            (1 - (room.selectedDiscount || 0) / 100) * (room.total - (room.holidaySupplement ?? 0)) +
                                            (room.holidaySupplement ?? 0)
                                        ).toLocaleString()}
                                    </span>
                                    <span className="ml-2 text-gray-500">
                                        (Discount: {room.selectedDiscount !== null ? room.selectedDiscount : 0}
                                        %)
                                    </span>
                                </div>
                                {onDeleteRoom && (
                                    <button
                                        onClick={() => onDeleteRoom(room.id)}
                                        className="self-end rounded bg-red-500 px-3 py-1 text-xs text-white transition-colors hover:bg-red-600"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <hr className="my-4 border-gray-200" />

                    <div className="items-right flex">
                        {/* <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-gray-600">Total Rooms</p>
              <p className="font-bold text-lg">{totalRooms}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-gray-600">Total Pax</p>
              <p className="font-bold text-lg">{totalPax}</p>
            </div> */}
                        <div className="rounded-md bg-gray-50 p-3">
                            <p className="text-gray-600">Total Amount</p>
                            <p className="text-lg font-bold">KES {totalAmount.toLocaleString()}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PriceSummary;
