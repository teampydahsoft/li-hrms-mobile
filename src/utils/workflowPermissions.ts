import type { User } from '../store/useAuthStore';

type WorkflowLike = {
    nextApproverRole?: string;
    nextApprover?: string;
    reportingManagerIds?: string[];
    approvalChain?: Array<{ role?: string; stepRole?: string }>;
};

type ItemLike = {
    status?: string;
    workflow?: WorkflowLike;
    odType?: string;
};

type LoanItemLike = {
    status?: string;
    workflow?: WorkflowLike;
};

function normalizeRole(v: unknown): string {
    return String(v || '').trim().toLowerCase();
}

function roleOrderFromItem(item: ItemLike): string[] {
    const chain = item.workflow?.approvalChain;
    if (!Array.isArray(chain)) return [];
    const out = chain
        .map((s) => normalizeRole(s.role || s.stepRole))
        .filter(Boolean);
    return Array.from(new Set(out));
}

function userIdOf(user: User | null | undefined): string {
    return String(user?.id || '').trim();
}

/**
 * Mirrors workspace leaves canPerformAction behavior for leave/OD.
 */
export function canCurrentUserActOnLeaveLikeItem(args: {
    item: ItemLike | null | undefined;
    user: User | null | undefined;
    isOD?: boolean;
    allowHigherAuthority?: boolean;
    globalRoleOrder?: string[];
}): boolean {
    const { item, user, allowHigherAuthority = false, globalRoleOrder = [] } = args;
    if (!item) return false;
    if (!user) return false;
    const userRole = normalizeRole(user.role);
    if (userRole === 'employee') return false;

    // Super/Sub admin can intervene unless final state.
    if (userRole === 'super_admin' || userRole === 'sub_admin') {
        return !['approved', 'rejected', 'cancelled'].includes(normalizeRole(item.status));
    }

    const roleOrder = roleOrderFromItem(item).length > 0 ? roleOrderFromItem(item) : globalRoleOrder.map(normalizeRole);
    const status = normalizeRole(item.status);
    const nextRole = normalizeRole(item.workflow?.nextApproverRole || item.workflow?.nextApprover);

    // Allow higher override after intermediate rejections (if configured).
    if (allowHigherAuthority && status.endsWith('_rejected') && status !== 'rejected') {
        const rejectingRole = status.replace('_rejected', '');
        if (roleOrder.length > 0) {
            const rejectIdx = roleOrder.indexOf(rejectingRole);
            let userIdx = roleOrder.indexOf(userRole);
            if (userIdx === -1 && (userRole === 'hr' || userRole === 'super_admin' || userRole === 'sub_admin')) {
                userIdx = roleOrder.length;
            }
            if (userIdx === -1 && userRole === 'manager') {
                const reportingIdx = roleOrder.indexOf('reporting_manager');
                const hrIdx = roleOrder.indexOf('hr');
                userIdx = reportingIdx >= 0 ? reportingIdx : hrIdx >= 0 ? hrIdx : roleOrder.length;
            }
            if (rejectIdx >= 0 && userIdx > rejectIdx) return true;
        }
    }

    // Strict next approver check
    if (nextRole) {
        if (userRole === nextRole) return true;
        if (nextRole === 'final_authority' && userRole === 'hr') return true;

        if (nextRole === 'reporting_manager') {
            if (userRole === 'manager' || userRole === 'hod') return true;
            const rmIds = Array.isArray(item.workflow?.reportingManagerIds) ? item.workflow?.reportingManagerIds : [];
            const uid = userIdOf(user);
            if (uid && rmIds.some((id) => String(id).trim() === uid)) return true;
        }

        if (allowHigherAuthority && roleOrder.length > 0) {
            const nextIdx = roleOrder.indexOf(nextRole);
            let userIdx = roleOrder.indexOf(userRole);
            if (userIdx === -1 && (userRole === 'hr' || userRole === 'super_admin' || userRole === 'sub_admin')) {
                userIdx = roleOrder.length;
            }
            if (userIdx === -1 && userRole === 'manager') {
                const reportingIdx = roleOrder.indexOf('reporting_manager');
                const hrIdx = roleOrder.indexOf('hr');
                userIdx = reportingIdx >= 0 ? reportingIdx : hrIdx >= 0 ? hrIdx : roleOrder.length;
            }
            if (nextIdx >= 0 && userIdx >= 0 && userIdx >= nextIdx) return true;
        }
        return false;
    }

    // Legacy fallback (records without workflow.nextApprover)
    if (status === 'pending') return userRole === 'hod' || userRole === 'manager';
    if (status === 'hod_approved' || status === 'manager_approved') return userRole === 'hr';
    return false;
}

/**
 * Loans/Salary-advance workflow gate, aligned to backend step checks.
 */
export function canCurrentUserActOnLoanItem(args: {
    item: LoanItemLike | null | undefined;
    user: User | null | undefined;
    allowHigherAuthority?: boolean;
    globalRoleOrder?: string[];
}): boolean {
    const { item, user, allowHigherAuthority = false, globalRoleOrder = [] } = args;
    if (!item || !user) return false;
    const userRole = normalizeRole(user.role);
    const status = normalizeRole(item.status);
    if (userRole === 'employee') return false;
    if (['approved', 'rejected', 'cancelled', 'completed', 'disbursed', 'active'].includes(status)) return false;

    // Super/Sub admin intervention support
    if (userRole === 'super_admin' || userRole === 'sub_admin') return true;

    const nextRole = normalizeRole(item.workflow?.nextApproverRole || item.workflow?.nextApprover);
    const roleOrder = roleOrderFromItem(item as ItemLike).length > 0
        ? roleOrderFromItem(item as ItemLike)
        : globalRoleOrder.map(normalizeRole);

    if (nextRole) {
        if (nextRole === userRole) return true;
        if ((nextRole === 'final_authority' || nextRole === 'hr') && userRole === 'hr') return true;
        if (nextRole === 'reporting_manager') {
            if (userRole === 'manager' || userRole === 'hod') return true;
            const rmIds = Array.isArray(item.workflow?.reportingManagerIds) ? item.workflow?.reportingManagerIds : [];
            const uid = userIdOf(user);
            if (uid && rmIds.some((id) => String(id).trim() === uid)) return true;
        }

        if (allowHigherAuthority && roleOrder.length > 0) {
            const nextIdx = roleOrder.indexOf(nextRole);
            let userIdx = roleOrder.indexOf(userRole);
            if (userIdx === -1 && (userRole === 'hr' || userRole === 'super_admin' || userRole === 'sub_admin')) {
                userIdx = roleOrder.length;
            }
            if (nextIdx >= 0 && userIdx >= 0 && userIdx >= nextIdx) return true;
        }
        return false;
    }

    // Legacy fallback
    if (status === 'pending') return userRole === 'hod' || userRole === 'manager';
    if (status === 'hod_approved' || status === 'manager_approved') return userRole === 'hr';
    return false;
}
