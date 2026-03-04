/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

const PriceSummary = ({
  selectedRooms,
  onDeleteRoom,
}: {
  selectedRooms: any[];
  onDeleteRoom?: (roomId: string) => void;
}) => {
  const totalRooms = selectedRooms.reduce(
    (sum, room) => sum + (room.rooms || 0),
    0
  );

  const totalAmount = selectedRooms.reduce(
    (sum, room) => sum + (1 - (room.selectedDiscount || 0) / 100) * room.total,
    0
  );

  const totalPax = selectedRooms.reduce((sum, room) => {
    return sum + (room.pax || 0);
  }, 0);

  return (
    <div className="mt-4 text-gray-800 dark:text-white bg-white rounded-lg shadow-md p-4">
      {selectedRooms.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No rooms selected</p>
      ) : (
        <>
          <div className="space-y-3">
            {selectedRooms.map((room, index) => (
              <div
                key={room.id || index}
                className="flex flex-col border-b border-gray-200 py-2 text-sm hover:bg-gray-50 rounded-md px-2 transition-colors"
              >
                <div className="flex-1 mb-2">
                  <span className="font-medium">
                    {room.rooms} {room.room_type}
                  </span>
                  <span className="text-gray-600"> {room.board_type}</span>
                  <span className="ml-2">
                    – KES{" "}
                    {(
                      (1 - (room.selectedDiscount || 0) / 100) *
                      room.total
                    ).toLocaleString()}
                  </span>
                  <span className="text-gray-500 ml-2">
                    (Discount:{" "}
                    {room.selectedDiscount !== null ? room.selectedDiscount : 0}
                    %)
                  </span>
                </div>
                {onDeleteRoom && (
                  <button
                    onClick={() => onDeleteRoom(room.id)}
                    className="self-end rounded bg-red-500 text-white px-3 py-1 text-xs hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <hr className="my-4 border-gray-200" />

          <div className="flex items-right">
            {/* <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-gray-600">Total Rooms</p>
              <p className="font-bold text-lg">{totalRooms}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-gray-600">Total Pax</p>
              <p className="font-bold text-lg">{totalPax}</p>
            </div> */}
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-gray-600">Total Amount</p>
              <p className="font-bold text-lg">
                KES {totalAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PriceSummary;
