/* eslint-disable @typescript-eslint/no-explicit-any */
export const calculateQuotation = (adultRooms: any[], kidsRooms: any[], formData: any) => {
    let totalAdultCharge = 0;
    let totalKidCharge = 0;
    const roomDetails: any[] = [];
    adultRooms.forEach((room) => {
        const adultCost = room.adultCost;
        const kidsCost = room.kidsCost || 0;
        console.log('final', room);
        totalAdultCharge += adultCost;
        totalKidCharge += kidsCost;

        const roomInfo = {
            room: room.room,
            selectedDiscount: room.discount,
            type: room.roomType,
            adults: room.paxPerRoom,
            kids: room.kidsInRoom.map((kidIndex: number) => formData.kids[kidIndex].age),
            kidIndices: room.kidsInRoom,
            adultCost: adultCost,
            kidsCost: kidsCost,
            totalCost: adultCost + kidsCost,
            nights: room.nights,
        };
        roomDetails.push(roomInfo);
    });

    kidsRooms.forEach((room) => {
        const kidsInRoom = room.kidsInRoom || [];

        totalKidCharge += room.cost;

        roomDetails.push({
            room: room.room,
            type: room.roomType,
            adults: 0,
            kids: kidsInRoom.map((kidIndex: number) => formData.kids[kidIndex].age),
            kidIndices: kidsInRoom,
            adultCost: 0,
            kidsCost: room.cost,
            totalCost: room.cost,
            nights: room.nights,
        });
    });

    const totalChargeForNights = totalAdultCharge + totalKidCharge;
    return {
        totalChargeForNights,
        totalAdultCharge,
        totalKidCharge,
        roomDetails,
        numNights: formData.numNights,
    };
};

export const saveLocally = (name: string, value: any, setFormData: React.Dispatch<React.SetStateAction<any>>) => {
    setFormData((prevFormData: any) => {
        const updatedFormData = { ...prevFormData, [name]: value };

        const data = prevFormData[name];

        if (JSON.stringify(data) === JSON.stringify(value)) {
            return prevFormData;
        }

        localStorage.setItem('quotationForm', JSON.stringify(updatedFormData));
        return updatedFormData;
    });
};
