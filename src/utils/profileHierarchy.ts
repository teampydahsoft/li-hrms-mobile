/** Mirrors web workspace profile hierarchy logic (reporting chain, HOD, division manager). */

export type HierarchyPerson = {
    name: string;
    email?: string;
    role?: string;
    _id?: string;
};

export type EmployeeProfileLike = {
    reporting_manager?: { employee_name?: string; name?: string; email?: string };
    reporting_to?: Array<{ _id?: string; name?: string; email?: string; role?: string } | string>;
    dynamicFields?: {
        reporting_to?: Array<{ _id?: string; name?: string; email?: string; role?: string } | string>;
    };
    division?: { _id?: string; name?: string };
    division_id?: string | { _id?: string; name?: string };
    department?: { _id?: string; name?: string };
    department_id?: string | { _id?: string; name?: string };
};

export function resolveId(val: unknown): string | undefined {
    if (val == null) return undefined;
    if (typeof val === 'string' && val.trim()) return val.trim();
    if (typeof val === 'object' && val !== null && '_id' in val) {
        const id = (val as { _id?: unknown })._id;
        if (id != null) return String(id);
    }
    return undefined;
}

function mongooseObjectIdShape(s: string) {
    return /^[a-f\d]{24}$/i.test(s);
}

export function collectReportingManagers(emp: EmployeeProfileLike | null): HierarchyPerson[] {
    if (!emp) return [];
    const raw =
        (Array.isArray(emp.reporting_to) && emp.reporting_to.length > 0
            ? emp.reporting_to
            : Array.isArray(emp.dynamicFields?.reporting_to) && emp.dynamicFields!.reporting_to!.length > 0
              ? emp.dynamicFields!.reporting_to!
              : null) || null;

    if (raw && raw.length > 0) {
        const out: HierarchyPerson[] = [];
        for (const item of raw) {
            if (item == null) continue;
            if (typeof item === 'string') {
                if (mongooseObjectIdShape(item)) continue;
                out.push({ name: item });
                continue;
            }
            const name =
                item.name ||
                (item as { employee_name?: string }).employee_name ||
                item.email ||
                '';
            if (!name) continue;
            out.push({
                name,
                email: item.email,
                role: item.role,
                _id: item._id != null ? String(item._id) : undefined,
            });
        }
        return out;
    }

    const leg = emp.reporting_manager;
    if (leg) {
        const name = leg.employee_name || leg.name;
        if (name) return [{ name, email: leg.email }];
    }
    return [];
}

export function divisionHodForEmployee(
    department: { divisionHODs?: Array<{ division?: unknown; hod?: unknown }>; hod?: unknown } | null,
    divisionIdStr: string | undefined
): HierarchyPerson | null {
    if (!department) return null;
    if (divisionIdStr && Array.isArray(department.divisionHODs)) {
        const match = department.divisionHODs.find((dh) => {
            const id = resolveId(dh.division);
            return id && id === divisionIdStr;
        });
        const hod = match?.hod;
        if (hod && typeof hod === 'object' && hod !== null && 'name' in hod && (hod as { name?: string }).name) {
            const h = hod as { name: string; email?: string; role?: string; _id?: string };
            return { name: h.name, email: h.email, role: h.role, _id: h._id != null ? String(h._id) : undefined };
        }
    }
    const legacy = department.hod;
    if (legacy && typeof legacy === 'object' && legacy !== null && 'name' in legacy && (legacy as { name?: string }).name) {
        const h = legacy as { name: string; email?: string; role?: string };
        return { name: h.name, email: h.email, role: h.role };
    }
    return null;
}

export function orgRecordFromApiResponse(res: unknown): Record<string, unknown> | null {
    if (res == null || typeof res !== 'object' || !('success' in res)) return null;
    const r = res as { success?: boolean; data?: unknown };
    if (!r.success || r.data == null || typeof r.data !== 'object' || Array.isArray(r.data)) return null;
    return r.data as Record<string, unknown>;
}
