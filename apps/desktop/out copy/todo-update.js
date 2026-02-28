const FIELD_DEFS = [
    {
        key: 'text',
        colSql: 'text',
        normalize: (raw) => {
            if (typeof raw !== 'string')
                return { shouldSet: false };
            const text = raw.trim();
            if (!text)
                return { shouldSet: false };
            return { shouldSet: true, value: text };
        },
    },
    {
        key: 'done',
        colSql: 'done',
        normalize: (raw) => {
            if (typeof raw !== 'boolean')
                return { shouldSet: false };
            return { shouldSet: true, value: raw ? 1 : 0 };
        },
    },
    {
        key: 'order',
        colSql: '"order"',
        normalize: (raw) => {
            if (typeof raw !== 'number' || !Number.isFinite(raw))
                return { shouldSet: false };
            return { shouldSet: true, value: Math.trunc(raw) };
        },
    },
    {
        key: 'app',
        colSql: 'app',
        normalize: (raw) => {
            if (raw == null)
                return { shouldSet: true, value: null };
            if (typeof raw !== 'string')
                return { shouldSet: false };
            const app = raw.trim();
            return { shouldSet: true, value: app ? app : null };
        },
    },
    {
        key: 'url',
        colSql: 'url',
        normalize: (raw) => {
            if (raw == null)
                return { shouldSet: true, value: null };
            if (typeof raw !== 'string')
                return { shouldSet: false };
            const url = raw.trim();
            return { shouldSet: true, value: url ? url : null };
        },
    },
    {
        key: 'allowedApps',
        colSql: 'allowed_apps',
        normalize: (raw) => {
            if (raw == null)
                return { shouldSet: true, value: null };
            if (!Array.isArray(raw))
                return { shouldSet: false };
            return { shouldSet: true, value: JSON.stringify(raw) };
        },
    },
    {
        key: 'deadline',
        colSql: 'deadline',
        normalize: (raw) => {
            if (raw == null)
                return { shouldSet: true, value: null };
            if (typeof raw !== 'string')
                return { shouldSet: false };
            const deadline = raw.trim();
            return { shouldSet: true, value: deadline ? deadline : null };
        },
    },
    {
        key: 'startTime',
        colSql: 'start_time',
        normalize: (raw) => {
            if (raw == null)
                return { shouldSet: true, value: null };
            if (typeof raw !== 'string')
                return { shouldSet: false };
            const st = raw.trim();
            return { shouldSet: true, value: st ? st : null };
        },
    },
    {
        key: 'durationMinutes',
        colSql: 'duration_minutes',
        normalize: (raw) => {
            if (raw == null)
                return { shouldSet: true, value: null };
            if (typeof raw !== 'number' || !Number.isFinite(raw))
                return { shouldSet: false };
            return { shouldSet: true, value: Math.trunc(raw) };
        },
    },
];
export function buildUpdateTodoSql(fields) {
    const setParts = [];
    const values = [];
    const rec = fields;
    for (const def of FIELD_DEFS) {
        if (!Object.prototype.hasOwnProperty.call(fields, def.key))
            continue;
        const raw = rec[def.key];
        const normalized = def.normalize(raw);
        if (!normalized.shouldSet)
            continue;
        setParts.push(`${def.colSql} = ?`);
        values.push(normalized.value);
    }
    if (setParts.length === 0)
        return null;
    return { setSql: setParts.join(', '), values };
}
