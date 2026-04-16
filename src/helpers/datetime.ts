import { DateTime } from 'luxon';
const timezone = 'UTC';

export function startOfDayISO(
    date: Date,
    tz: string = timezone
): string | null {
    return DateTime.fromJSDate(date, { zone: tz })
        .startOf('day')
        .toUTC()
        .toISO();
}

export function endOfDayISO(date: Date, tz: string = timezone): string | null {
    return DateTime.fromJSDate(date, { zone: tz }).endOf('day').toUTC().toISO();
}
