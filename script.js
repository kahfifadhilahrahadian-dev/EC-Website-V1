document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('attendanceForm');
    const successToast = document.getElementById('successMessage');
    const tableBody = document.getElementById('attendanceBody');
    const recordCount = document.getElementById('recordCount');
    const currentDateText = document.getElementById('currentDateText');

    // PASTE YOUR GOOGLE APPS SCRIPT URL HERE IF AVAILABLE
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

    // Local Storage Data Management
    let attendanceData = JSON.parse(localStorage.getItem('ec_seputas_attendance')) || [];

    function updateTable() {
        tableBody.innerHTML = '';
        recordCount.textContent = `${attendanceData.length} Terdata`;

        if (attendanceData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #94a3b8; padding: 2rem;">
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
                <td><span class="date-pill">📅 ${item.fullDate || 'Jumat, 12 Sep 2026'}</span></td>
                <td style="color: #64748b; font-size: 0.85rem; font-weight: 600;">${item.timeOnly || item.time}</td>
                <td><span class="session-pill">${item.session || 'Weekly Meeting'}</span></td>
                <td style="font-weight: 700; color: #1e293b;">${item.name}</td>
                <td>${item.memberId}</td>
                <td><span style="${statusBadgeStyle}">${item.status}</span></td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Initial render
    updateTable();

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
        const timeOnlyStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' WIB';

        const record = {
            fullDate: fullDateStr,
            timeOnly: timeOnlyStr,
            session: session,
            name: name,
            memberId: memberId,
            status: status,
            notes: notes,
            time: `${fullDateStr} (${timeOnlyStr})`
        };

        attendanceData.unshift(record);
        localStorage.setItem('ec_seputas_attendance', JSON.stringify(attendanceData));

        updateTable();

       // Send to Google Sheets and reload data live
            fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(record)
            })
            .then(response => response.json())
            .then(result => {
                if (successToast) successToast.classList.remove('hidden');
                form.reset();
                
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;

                setTimeout(() => {
                    if (successToast) successToast.classList.add('hidden');
                }, 4000);

                // Langsung muat ulang tabel agar data baru langsung muncul di kedua device
                loadLiveAttendanceData();
            })
            .catch(err => {
                console.error('Error sending to Google Sheets:', err);
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
                // Tetap panggil data agar tabel tetap ter-refresh
                loadLiveAttendanceData();
            });

        // UI Feedback
        successToast.classList.remove('hidden');
        form.reset();

        setTimeout(() => {
            successToast.classList.add('hidden');
        }, 4000);
    });
});
