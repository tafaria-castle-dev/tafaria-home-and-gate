export const getDiscountPercentage = (selectedDiscount: number | { rate: number } | null | undefined): number => {
    if (typeof selectedDiscount === 'number') {
        return selectedDiscount;
    }
    if (selectedDiscount && 'rate' in selectedDiscount) {
        return selectedDiscount.rate;
    }
    return 0;
};
