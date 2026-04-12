export function getEasterDates(year: number): { start: Date; end: Date } {
    const a = year % 19,
        b = Math.floor(year / 100),
        c = year % 100;
    const d = Math.floor(b / 4),
        e = b % 4,
        f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4),
        k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return {
        start: new Date(year, month, day - 2),
        end: new Date(year, month, day + 1),
    };
}
export function computeHolidayNightsFromIndices(checkInDate: Date, nightIndices: number[]): number {
    return nightIndices.filter((nightIndex) => {
        const nightDate = new Date(checkInDate);
        nightDate.setDate(checkInDate.getDate() + (nightIndex - 1));
        return isHolidayDate(nightDate);
    }).length;
}
export function isHolidayDate(date: Date): boolean {
    const month = date.getMonth(),
        day = date.getDate(),
        year = date.getFullYear();
    if (month === 11 && day >= 24 && day <= 26) return true;
    const { start, end } = getEasterDates(year);
    return date.getTime() >= start.getTime() && date.getTime() < end.getTime();
}
export function getItemHolidayNights(nights: number[], checkInDate: Date): { count: number; supplementPerNight: number } {
    if (!nights?.length || !checkInDate) return { count: 0, supplementPerNight: 0 };

    const holidayCount = nights.filter((nightIndex) => {
        // nightIndex is 1-based: night 1 = the check-in date itself
        const nightDate = new Date(checkInDate);
        nightDate.setDate(checkInDate.getDate() + nightIndex - 1);
        nightDate.setHours(0, 0, 0, 0);
        return isHolidayDate(nightDate);
    }).length;

    return { count: holidayCount, supplementPerNight: 0 };
}
