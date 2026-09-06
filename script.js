document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('attendanceForm');
    const successToast = document.getElementById('successMessage');
    const tableBody = document.getElementById('attendanceBody');
    const recordCount = document.getElementById('recordCount');
    const currentDateText = document.getElementById('currentDateText');
    const submitBtn = form.querySelector('.btn-submit');
    const originalBtnHTML = submitBtn.innerHTML;

    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZqevHoeVEsgwzgniOfxfa0_ZY7ZcKB_X4WAD4b5fXRtdyMZJ88aHccqkPXVlcdG_a7g/exec';

    // Helper: Format Date to Indonesian Day and Date (e.g., Jumat, 12 September 2026)
    function getFormattedDate(dateObj) {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const dayName = days[dateObj.getDay()];
        const dayNum = dateObj.getDate();
        const monthName = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        return `${dayName}, ${dayNum} ${monthName} ${year}`;
    }

    // Display Today's Date in Hero Header
    const nowObj = new Date();
    currentDateText.textContent = getFormattedDate(nowObj);

    // Local cache (dipakai hanya untuk tampilan instan sebelum data live datang, bukan sumber utama)
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

    // Ambil data TERBARU dari Google Sheets (ini yang bikin datanya "live" di semua device)
    function loadLiveAttendanceData() {
        fetch(GOOGLE_SCRIPT_URL)
            .then(response => response.json())
            .then(rows => {
                // Samakan nama field dari Sheets (date, class) ke format tampilan (fullDate, memberId)
                // dan urutkan agar yang terbaru muncul di paling atas
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
                // Kalau gagal fetch (misal offline), tetap tampilkan cache lokal yang ada
                renderTable();
            });
    }

    // Render dulu pakai cache lokal (instan), lalu langsung timpa dengan data live
    renderTable();
    loadLiveAttendanceData();

    // Form submission handler
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

        // PENTING: nama field ini harus sama persis dengan yang dibaca doPost di Apps Script
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
                form.reset();
                setTimeout(() => {
                    if (successToast) successToast.classList.add('hidden');
                }, 4000);

                // Muat ulang data dari Sheets supaya baris baru langsung terlihat (juga di device lain saat mereka refresh)
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