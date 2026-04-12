/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

interface QuotationSummaryProps {
    formData: any;
}

const QuotationSummary: React.FC<QuotationSummaryProps> = ({ formData }) => {
    const hasQuotation = formData.quotationLeisure && formData.quotationLeisure?.roomDetails;

    if (!hasQuotation) {
        return null;
    }

    const roomDetails = formData.quotationLeisure.roomDetails || [];
    console.log('Rendering QuotationSummary with roomDetails:', roomDetails);

    const getDiscountedRoomTotal = (room: any) => {
        const hasHoliday = (room.holidayNights ?? 0) > 0 && (room.holidaySupplement ?? 0) > 0;
        return Math.round((hasHoliday ? room.totalCost - room.holidaySupplement : room.totalCost) * (1 - (room?.selectedDiscount || 0) / 100));
    };

    const totalDiscounted = roomDetails.reduce((sum: number, room: any) => sum + getDiscountedRoomTotal(room), 0);

    const hasAnyHoliday = roomDetails.some((room: any) => (room.holidayNights ?? 0) > 0 && (room.holidaySupplement ?? 0) > 0);

    return (
        <div className="mt-6 rounded-md border border-green-200 bg-green-50 p-4">
            <h3 className="text-lg font-semibold text-green-800">Quotation Summary</h3>

            <h4 className="text-md mt-4 font-semibold text-gray-700">Room Breakdown:</h4>

            {roomDetails.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">No rooms added yet</p>
            ) : (
                <div className="mt-2 space-y-3">
                    {roomDetails.map((room: any, index: number) => {
                        const hasHoliday = (room.holidayNights ?? 0) > 0 && (room.holidaySupplement ?? 0) > 0;
                        const holidayLabel = room.holidayLabel || 'Holiday Period';

                        return (
                            <div key={index} className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
                                <p className="font-medium text-gray-800">
                                    Room {index + 1}: {room.type}
                                    {room.boardType && ` – ${room.boardType}`}
                                </p>

                                <div className="mt-1 grid grid-cols-2 gap-1 text-sm text-gray-600">
                                    <div>Pax: {room.adults > 0 ? room.adults : room.kids?.length || 0}</div>
                                    {room.nights && <div>Nights: {room.nights.join(', ')}</div>}
                                </div>

                                {hasHoliday && (
                                    <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-sm">
                                        <p className="font-medium text-amber-800">
                                            {holidayLabel} applies ({room.holidayNights} night
                                            {room.holidayNights > 1 ? 's' : ''})
                                        </p>
                                        <p className="text-amber-700">
                                            Holiday Supplement: <strong>KSh {Math.round(room.holidaySupplement).toLocaleString()}</strong>
                                        </p>
                                    </div>
                                )}

                                {Array.isArray(room.kidIndices) && room.kidIndices.length > 0 && (
                                    <div className="mt-2 text-sm text-gray-600">
                                        Kids:{' '}
                                        {room.kidIndices.map((kidIndex: number, idx: number) => (
                                            <span key={idx}>
                                                Kid {formData.kids?.[kidIndex]?.id || '?'} (Age: {formData.kids?.[kidIndex]?.age || '?'})
                                                {idx !== room.kidIndices.length - 1 && ', '}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-3 border-t pt-2 text-sm text-gray-700">
                                    <p>Adult Cost: KSh {Math.round(room.adultCost).toLocaleString()}</p>
                                    {room.kidsCost > 0 && <p>Kids Cost: KSh {Math.round(room.kidsCost).toLocaleString()}</p>}

                                    {hasHoliday && (
                                        <p className="mt-1">
                                            Base Cost (excl. supplement): KSh {Math.round(room.totalCost - room.holidaySupplement).toLocaleString()}
                                        </p>
                                    )}

                                    {room?.selectedDiscount > 0 && (
                                        <p className="mt-1 text-green-700">
                                            Discount: {room.selectedDiscount}% → saves KSh{' '}
                                            {Math.round(
                                                (hasHoliday ? room.totalCost - room.holidaySupplement : room.totalCost) *
                                                    (room.selectedDiscount / 100),
                                            ).toLocaleString()}
                                        </p>
                                    )}

                                    <p className="mt-2 font-semibold text-gray-900">
                                        Total Room Cost: KSh {getDiscountedRoomTotal(room).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-5 space-y-3 border-t border-green-200 pt-4">
                <p className="text-md font-medium text-gray-800">
                    Total Charge for {formData.quotationLeisure.numNights} Night
                    {formData.quotationLeisure.numNights > 1 ? 's' : ''}:{' '}
                    <span className="font-semibold">KSh {Math.round(formData.quotationLeisure.totalChargeForNights).toLocaleString()}</span>
                </p>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-md font-medium text-green-800">Final Discounted Total:</p>
                    <div className="text-right">
                        <span className="text-xl font-bold text-gray-900">KSh {Math.round(totalDiscounted).toLocaleString()}</span>
                        {hasAnyHoliday && <div className="mt-1 text-sm font-medium text-amber-700">★ Includes holiday supplement(s)</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuotationSummary;
