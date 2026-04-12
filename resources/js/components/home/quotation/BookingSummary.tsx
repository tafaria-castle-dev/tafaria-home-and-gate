/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import RoomTable from '../../quotations/RoomTable';
import RoomTableLeisure from '../../quotations/RoomTableLeisure';
import ServiceTable from '../../quotations/ServiceTable';

export default function BookingSummary({ formData, onDiscountChange, setFormData }: { setFormData: any; formData: any; onDiscountChange: any }) {
    // Calculate total room cost
    let totalRoomCost: number = 0;

    if (formData.selectedType == 'Corporate') {
        totalRoomCost = formData.updatedRoomDetails.reduce((sum: number, room: any) => sum + room.total, 0);
    } else {
        if (formData.quotationLeisure) {
            if (formData.numNights == 0 || formData.numNights == undefined || formData.numNights == '0') {
                totalRoomCost = 0;
            } else {
                totalRoomCost = formData.quotationLeisure.totalChargeForNights;
            }
        }
    }
    const [totalRoom, setTotalRoom] = useState(0);
    const [totalExperience, setTotalExperience] = useState(0);

    const totalAdditionalServicesCost = formData.selectedAdditionalServices.reduce(
        (sum: number, service: any) => sum + (service?.amount_ksh || 0) * (service?.noofpax || 1) * (service?.numnights || 1),
        0,
    );

    const handleDeleteService = (serviceId: string) => {
        setFormData((prev: any) => {
            const updatedServices = prev.selectedAdditionalServices.filter((service: any) => service.id !== serviceId);
            const servicesNotes = updatedServices
                .map((service: any) => service.description)
                .filter((desc: string) => desc)
                .join('\n');
            const updatedFormData = {
                ...prev,
                selectedAdditionalServices: updatedServices,
                notes: servicesNotes,
            };
            localStorage.setItem('quotationForm', JSON.stringify(updatedFormData));
            return updatedFormData;
        });
    };
    let totalBeforeDiscount = 0;
    if (formData.selectedType == 'Corporate') {
        totalBeforeDiscount = totalRoomCost * formData.numNights + totalAdditionalServicesCost;
    } else {
        totalBeforeDiscount = totalRoomCost + totalAdditionalServicesCost;
    }

    let discountAmount = 0;
    if (formData.discountAmount) {
        discountAmount = formData.discountAmount;
    } else {
        discountAmount = (formData.discount / 100) * totalBeforeDiscount;
    }
    const finalAmount = totalBeforeDiscount - discountAmount;
    useEffect(() => {
        const total = totalExperience + totalRoom;
        localStorage.setItem('totalCost', total.toString());
    }, [totalRoom, totalExperience]);
    return (
        <div className="float-right bg-white px-6 pb-6 text-right">
            <div className="space-y-3">
                {formData.selectedType === 'Corporate' && (
                    <>
                        {formData && (
                            <>
                                <RoomTable items={formData.updatedRoomDetails} formData={formData} onTotalChange={setTotalRoom} />
                            </>
                        )}
                        <ServiceTable
                            services={formData.selectedAdditionalServices}
                            onTotalChange={setTotalExperience}
                            onDeleteService={handleDeleteService}
                        />
                    </>
                )}
                {(formData.selectedType === 'Leisure' || formData.selectedType === 'Immersion') && (
                    <>
                        {formData.quotationLeisure.roomDetails?.length > 0 && (
                            <RoomTableLeisure items={formData.quotationLeisure.roomDetails} formData={formData} onTotalChange={setTotalRoom} />
                        )}
                        {formData.selectedAdditionalServices.length > 0 && (
                            <ServiceTable
                                services={formData.selectedAdditionalServices}
                                onTotalChange={setTotalExperience}
                                onDeleteService={handleDeleteService}
                            />
                        )}
                    </>
                )}

                <p className="mt-4 border-t pt-3 text-xl font-bold text-gray-900">
                    <strong>Final Amount:</strong>
                    <span className="ml-2">Kes {Math.round(totalExperience + totalRoom).toLocaleString()}</span>
                </p>
            </div>
        </div>
    );
}
