import cron from 'node-cron';
import { completePastSchedules } from '@src/services/schedule.service';

export function startScheduleJobs() {
    // timezone: change if server uses different timezone
    const tz = 'Asia/Ho_Chi_Minh';

    const nowStr = () => {
        const now = new Date();
        const local = now.toLocaleString('vi-VN', { timeZone: tz });
        const utc = now.toISOString();
        return { local, utc };
    };
    // check lúc 5 phút sau khi ca 1 kết thúc
    cron.schedule(
        '5 13 * * *',
        async () => {
            console.log(
                '[jobs] shift-end check ca1 at',
                new Date().toISOString()
            );
            try {
                const res = await completePastSchedules();
                console.log('[jobs] completePastSchedules result', res);
            } catch (err) {
                console.error('[jobs] error', err);
            }
        },
        { timezone: tz }
    );
    // check lúc 5 phút sau khi ca 2 kết thúc
    cron.schedule(
        '5 19 * * *',
        async () => {
            console.log(
                '[jobs] shift-end check ca2 at',
                new Date().toISOString()
            );
            try {
                const res = await completePastSchedules();
                console.log('[jobs] completePastSchedules result', res);
            } catch (err) {
                console.error('[jobs] error', err);
            }
        },
        { timezone: tz }
    );
    // check lúc 5 phút sau khi ca 3 kết thúc
    cron.schedule(
        '5 7 * * *',
        async () => {
            console.log(
                '[jobs] shift-end check ca3 at',
                new Date().toISOString()
            );
            try {
                const res = await completePastSchedules();
                console.log('[jobs] completePastSchedules result', res);
            } catch (err) {
                console.error('[jobs] error', err);
            }
        },
        { timezone: tz }
    );

    const t0 = nowStr();
    console.log('[jobs] scheduleJobs started (shift-end runs)', {
        startedAtLocal: t0.local,
    });
}
