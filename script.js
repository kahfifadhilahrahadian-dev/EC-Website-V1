document.addEventListener('DOMContentLoaded', () => {
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZqevHoeVEsgwzgniOfxfa0_ZY7ZcKB_X4WAD4b5fXRtdyMZJ88aHccqkPXVlcdG_a7g/exec';

    // ============================================
    // BAGIAN LOGIN / REGISTER
    // ============================================
    const authScreen = document.getElementById('authScreen');
    const mainContent = document.getElementById('mainContent');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const showRegisterLink = document.getElementById('showRegisterLink');
    const showLoginLink = document.getElementById('showLoginLink');
    const showLoginWrap = document.getElementById('showLoginWrap');
    const navUserInfo = document.getElementById('navUserInfo');
    const logoutBtn = document.getElementById('logoutBtn');

    function getLoggedInMember() {
        const raw = localStorage.getItem('ec_member');
        return raw ? JSON.parse(raw) : null;
    }

    function showApp(member) {
        authScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        if (navUserInfo) navUserInfo.textContent = `Halo, ${member.nama} 👋`;

        const fullNameInput = document.getElementById('fullName');
        const memberIdInput = document.getElementById('memberId');
        if (fullNameInput) { fullNameInput.value = member.nama; fullNameInput.readOnly = true; }
        if (memberIdInput) { memberIdInput.value = member.kelas; memberIdInput.readOnly = true; }
    }

    function showAuthScreen() {
        authScreen.classList.remove('hidden');
        mainContent.classList.add('hidden');
    }

    const currentMember = getLoggedInMember();
    if (currentMember) {
        showApp(currentMember);
    } else {
        showAuthScreen();
    }

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            showLoginWrap.classList.remove('hidden');
            showRegisterLink.parentElement.classList.add('hidden');
            authTitle.textContent = 'Daftar Member Baru';
            authSubtitle.textContent = 'Buat akun untuk mengakses website English Club Seputas.';
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            showLoginWrap.classList.add('hidden');
            showRegisterLink.parentElement.classList.remove('hidden');
            authTitle.textContent = 'Login Member';
            authSubtitle.textContent = 'Masuk untuk mengakses website English Club Seputas.';
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            loginError.style.display = 'none';

            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;

            fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'login', username, password })
            })
                .then(res => res.json())
                .then(result => {
                    if (result.result === 'success') {
                        const member = { username, nama: result.nama, kelas: result.kelas, kontak: result.kontak };
                        localStorage.setItem('ec_member', JSON.stringify(member));
                        showApp(member);
                        loadLiveAttendanceData();
                    } else {
                        loginError.textContent = result.message || 'Login gagal, coba lagi.';
                        loginError.style.display = 'block';
                    }
                })
                .catch(() => {
                    loginError.textContent = 'Gagal terhubung ke server. Cek koneksi internet.';
                    loginError.style.display = 'block';
                });
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            registerError.style.display = 'none';

            const nama = document.getElementById('regNama').value.trim();
            const kelas = document.getElementById('regKelas').value.trim();
            const kontak = document.getElementById('regKontak').value.trim();
            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value;

            fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'register', nama, kelas, kontak, username, password })
            })
                .then(res => res.json())
                .then(result => {
                    if (result.result === 'success') {
                        const member = { username, nama: result.nama, kelas: result.kelas, kontak: result.kontak };
                        localStorage.setItem('ec_member', JSON.stringify(member));
                        showApp(member);
                        loadLiveAttendanceData();
                    } else {
                        registerError.textContent = result.message || 'Pendaftaran gagal, coba lagi.';
                        registerError.style.display = 'block';
                    }
                })
                .catch(() => {
                    registerError.textContent = 'Gagal terhubung ke server. Cek koneksi internet.';
                    registerError.style.display = 'block';
                });
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('ec_member');
            location.reload();
        });
    }

    // ============================================
    // BAGIAN ABSENSI (sama seperti sebelumnya)
    // ============================================
    const form = document.getElementById('attendanceForm');
    const successToast = document.getElementById('successMessage');
    const tableBody = document.getElementById('attendanceBody');
    const recordCount = document.getElementById('recordCount');
    const currentDateText = document.getElementById('currentDateText');
    const submitBtn = form.querySelector('.btn-submit');
    const originalBtnHTML = submitBtn.innerHTML;

    function getFormattedDate(dateObj) {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const dayName = days[dateObj.getDay()];
        const dayNum = dateObj.getDate();
        const monthName = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        return `${dayName}, ${dayNum} ${monthName} ${year}`;
    }

    const nowObj = new Date();
    currentDateText.textContent = getFormattedDate(nowObj);

    let attendanceData = JSON.parse(localStorage.getItem('ec_seputas_attendance')) || [];

    function renderTable() {
        tableBody.innerHTML = '';
        recordCount.textContent = `${attendanceData.length} Terdata`;

        if (attendanceData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">
                        Belum ada data presensi terdaftar. Silakan isi form di atas!
                    </td>
                </tr>
            `;
            return;
        }

        attendanceData.forEach(item => {
            const tr = document.createElement('tr');

            let statusBadgeStyle = 'color: #16a34a; background: #dcfce7; padding: 3px 10px; border-radius: 12px; font-size: 0.82rem; font-weight: 700;';
            if (item.status === 'Izin') {
                statusBadgeStyle = 'color: #d97706; background: #fef3c7; padding: 3px 10px; border-radius: 12px; font-size: 0.82rem; font-weight: 700;';
            } else if (item.status === 'Sakit') {
                statusBadgeStyle = 'color: #dc2626; background: #fee2e2; padding: 3px 10px; border-radius: 12px; font-size: 0.82rem; font-weight: 700;';
            }

            tr.innerHTML = `
                <td><span class="date-pill">📅 ${item.fullDate}</span></td>
                <td style="color: #64748b; font-size: 0.85rem; font-weight: 600;">${item.timeOnly}</td>
                <td><span class="session-pill">${item.session}</span></td>
                <td style="font-weight: 700; color: #1e293b;">${item.name}</td>
                <td>${item.memberId}</td>
                <td><span style="${statusBadgeStyle}">${item.status}</span></td>
                <td style="color: #64748b; font-size: 0.85rem; max-width: 220px; white-space: normal;">${item.notes && item.notes.trim() !== '' ? item.notes : '-'}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function loadLiveAttendanceData() {
        fetch(GOOGLE_SCRIPT_URL)
            .then(response => response.json())
            .then(rows => {
                attendanceData = rows.map(row => ({
                    fullDate: row.date,
                    timeOnly: row.timeOnly,
                    session: row.session,
                    name: row.name,
                    memberId: row.class,
                    status: row.status,
                    notes: row.notes
                })).reverse();

                localStorage.setItem('ec_seputas_attendance', JSON.stringify(attendanceData));
                renderTable();
            })
            .catch(err => {
                console.error('Gagal mengambil data live dari Google Sheets:', err);
                renderTable();
            });
    }

    renderTable();
    if (currentMember) loadLiveAttendanceData();

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const session = document.getElementById('sessionName').value;
        const name = document.getElementById('fullName').value.trim();
        const memberId = document.getElementById('memberId').value.trim();
        const status = document.getElementById('status').value;
        const notes = document.getElementById('notes').value.trim();

        const now = new Date();
        const fullDateStr = getFormattedDate(now);
        const timeOnlyStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' WIB';

        const record = {
            date: fullDateStr,
            timeOnly: timeOnlyStr,
            session: session,
            name: name,
            class: memberId,
            status: status,
            notes: notes
        };

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Mengirim...</span> ⏳';

        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(record)
        })
            .then(response => response.json())
            .then(() => {
                if (successToast) successToast.classList.remove('hidden');
                document.getElementById('status').value = '';
                document.getElementById('notes').value = '';
                setTimeout(() => {
                    if (successToast) successToast.classList.add('hidden');
                }, 4000);
                loadLiveAttendanceData();
            })
            .catch(err => {
                console.error('Error sending to Google Sheets:', err);
                alert('Gagal mengirim presensi. Cek koneksi internet lalu coba lagi.');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHTML;
            });
    });
});