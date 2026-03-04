import React from 'react';
import { getDiscountPercentage } from '../utils/discountAsPercentage';

interface RoomListProps {
    title: string;
    rooms: any[];
    formData: any;
    onDeleteRoom: (index: number) => void;
    onEditRoom?: (index: number) => void;
    isKidsRoom?: boolean;
}

const RoomList: React.FC<RoomListProps> = ({ title, rooms, formData, onDeleteRoom, onEditRoom, isKidsRoom = false }) => {
    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold">{title}</h3>
            {rooms.length === 0 ? (
                <p className="text-sm text-gray-500">No {isKidsRoom ? 'kids' : 'adult'} rooms added yet</p>
            ) : (
                <ul>
                    {rooms.map((room, index) => (
                        <li key={index} className="mt-2 rounded-md border border-gray-200 p-3">
                            <p>{`Room ${index + 1}: ${room.roomType} - Pax: ${room.paxPerRoom}`}</p>
                            <p className="mt-1">Board Type: {room.boardType}</p>
                            <p className="mt-1">Nights: {room.nights.join(', ')}</p>
                            <p className="mt-1">
                                Kids:{' '}
                                {room.kidsInRoom && room.kidsInRoom.length > 0
                                    ? room.kidsInRoom.map((kidIndex: number, idx: number) => (
                                          <span key={idx}>
                                              Kid {formData.kids[kidIndex].id} (Age: {formData.kids[kidIndex].age})
                                              {idx < room.kidsInRoom.length - 1 ? ', ' : ''}
                                          </span>
                                      ))
                                    : 'No kids'}
                            </p>
                            <div className="mt-2 text-sm text-gray-700">
                                {!isKidsRoom && <p>Adult Cost: Ksh {room.adultCost}</p>}
                                {!isKidsRoom && room.kidsCost ? (
                                    <p>Kids Cost: Kes {Math.round(room.kidsCost)}</p>
                                ) : isKidsRoom ? (
                                    <p>
                                        Kids Cost (80% of room rate
                                        {room.kidsInRoom.length == 3 && ' + meals and bed for third kid '}
                                        ): Kes {Math.round(room.kidsCost)}
                                    </p>
                                ) : null}
                                {room?.discount !== null && (
                                    <h3 className="mt-2 text-sm text-gray-800">Discount: {getDiscountPercentage(room.discount)}%</h3>
                                )}
                                <p className="font-semibold">
                                    Total Room Cost: Ksh {Math.round(room.cost * (1 - getDiscountPercentage(room.discount) / 100))}
                                </p>
                            </div>
                            <div className="mt-2 flex space-x-2">
                                <button
                                    onClick={() => onDeleteRoom(index)}
                                    className="rounded bg-red-500 px-2 py-1 text-sm text-white hover:bg-red-600"
                                >
                                    Delete
                                </button>
                                {onEditRoom && (
                                    <button
                                        onClick={() => onEditRoom(index)}
                                        className="rounded bg-blue-500 px-2 py-1 text-sm text-white hover:bg-blue-600"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default RoomList;
