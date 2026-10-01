(function () {
    const STUDENT_LOGIN_RANGES = [
        // es24ad01 .. es24ad183 -> password AD@20yyXXX (yy=24, XXX=last 3 digits of id)
        { prefix: 'es24ad', start: 1, end: 183, minWidth: 2, passwordType: 'year', year: '24' },
        // es25ad001 .. es25ad189 -> password AD@20yyXXX (yy=25, XXX=last 3 digits of id)
        { prefix: 'es25ad', start: 1, end: 189, minWidth: 3, passwordType: 'year', year: '25' },
        // es25lad02 .. es25lad07 -> password AD@LAD25CCC (CCC=last 3 digits of id)
        { prefix: 'es25lad', start: 2, end: 7, minWidth: 2, passwordType: 'lad25' },
        // es23ad1 .. es23ad120 -> password AD@20yyXXX (yy=23, XXX=last 3 digits of id)
        { prefix: 'es23ad', start: 1, end: 120, minWidth: 1, passwordType: 'year', year: '23' },
        // es24lad01 .. es24lad02 -> password AD@24LASS (SS=last 2 digits of id)
        { prefix: 'es24lad', start: 1, end: 2, minWidth: 2, passwordType: 'lad24' }
    ];
    const DEFAULT_JOIN_DATE = '2026-07-25';

    function toSuffix(number, minWidth) {
        return String(number).padStart(minWidth, '0');
    }

    function isValidNumber(number, range) {
        return Number.isInteger(number) && number >= range.start && number <= range.end;
    }

    function buildPassword(range, number) {
        switch (range.passwordType) {
            case 'year':
                return `AD@20${range.year}${String(number).padStart(3, '0')}`;
            case 'lad24':
                return `AD@24LA${String(number).padStart(2, '0')}`;
            case 'lad25':
                return `AD@LAD25${String(number).padStart(3, '0')}`;
            default:
                return null;
        }
    }

    function getPassword(username) {
        const parsed = parseUsername(username);
        if (!parsed) return null;
        return parsed.password;
    }

    function parseUsername(username) {
        const value = String(username || '').trim().toLowerCase();

        for (const range of STUDENT_LOGIN_RANGES) {
            if (!value.startsWith(range.prefix)) continue;

            const rawSuffix = value.slice(range.prefix.length);
            if (!/^\d+$/.test(rawSuffix)) continue;

            const number = Number(rawSuffix);
            if (!isValidNumber(number, range)) continue;

            const suffix = toSuffix(number, range.minWidth);
            const normalizedUsername = `${range.prefix}${suffix}`;
            const displayId = normalizedUsername.toUpperCase();

            return {
                username: normalizedUsername,
                number,
                suffix,
                displayId,
                password: buildPassword(range, number),
                role: 'student',
                memberId: displayId,
                fullName: `Student ${displayId}`,
                email: `${normalizedUsername}@esec.edu`
            };
        }

        return null;
    }

    function createMember(loginInfo, joinDate) {
        return {
            id: loginInfo.memberId,
            name: loginInfo.fullName,
            email: loginInfo.email,
            phone: 'Not provided',
            type: 'Student',
            joinDate: joinDate || DEFAULT_JOIN_DATE,
            status: 'Active'
        };
    }

    function listCredentials() {
        const credentials = [];

        STUDENT_LOGIN_RANGES.forEach(range => {
            for (let number = range.start; number <= range.end; number += 1) {
                const username = `${range.prefix}${toSuffix(number, range.minWidth)}`;
                credentials.push(parseUsername(username));
            }
        });

        return credentials;
    }

    function ensureMembers(members, joinDate) {
        const source = Array.isArray(members) ? members : [];
        const nextMembers = [...source];
        const existingIds = new Set(
            nextMembers.map(member => String(member.id || '').toLowerCase())
        );
        let changed = false;

        listCredentials().forEach(loginInfo => {
            const idKey = loginInfo.memberId.toLowerCase();
            if (!existingIds.has(idKey)) {
                nextMembers.push(createMember(loginInfo, joinDate));
                existingIds.add(idKey);
                changed = true;
            }
        });

        return { members: nextMembers, changed };
    }

    window.StudentLogins = Object.freeze({
        ranges: STUDENT_LOGIN_RANGES.map(range => ({ ...range })),
        firstUsername: 'es24ad01',
        lastUsername: 'es24lad02',
        getPassword,
        parseUsername,
        createMember,
        listCredentials,
        ensureMembers
    });
}());
