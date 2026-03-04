export const getTaxCode = (tax: any): string => {
    return tax.tax_code ?? tax.taxCode ?? '';
};
