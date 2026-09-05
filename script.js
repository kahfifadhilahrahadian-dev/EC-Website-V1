document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('attendanceForm');
    const successToast = document.getElementById('successMessage');
    const tableBody = document.getElementById('attendanceBody');
    const recordCount = document.getElementById('recordCount');
    const currentDateText = document.getElementById('currentDateText');

    // URL Google Apps Script yang sudah dimasukkan
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby5gJf0NEpVUgp3IJWqsqZLf20AEB_8xFIoiIdbH49ZEefOymw1xmzGWP6IJmrJ4ZQRQA/exec';

    // Format Tanggal
    function getFormattedDate(dateObj) {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${days[dateObj.getDay()]}, ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    }

    if (currentDateText) {
        currentDateText.textContent = getFormattedDate(new Date());
    }

    // Fungsi Menarik Data dari Spreadsheet (GET)
    async function loadLiveAttendanceData() {
        if (!tableBody) return;
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #f59e0b; padding: 2rem; font-weight: 600;">
                    🔄 Memuat data presensi live dari Google Sheets...
                </td>
            </tr>
        `;
        
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL);
            const data = await response.json();
            
            tableBody.innerHTML = '';
            if (recordCount) recordCount.textContent = `${data.length} Terdata`;

            if (!data || data.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">
                            Belum ada data presensi terdaftar. Silakan isi form di atas!
                        </td>
                    </tr>
                `;
                return;
            }

            // Membalik urutan data (data terbaru di atas)
            [...data].reverse().forEach(item => {
                const tr = document.createElement('tr');
                
                let statusBadgeStyle = 'color: #16a34a; background: #dcfce7; padding: 4px 12px; border-radius: 12px; font-size: 0.82rem; font-weight: 700; display: inline-block;';
                if (item.status && item.status.toLowerCase() === 'izin') {
                    statusBadgeStyle = 'color: #d97706; background: #fef3c7; padding: 4px 12px; border-radius: 12px; font-size: 0.82rem; font-weight: 700; display: inline-block;';
                } else if (item.status && item.status.toLowerCase() === 'sakit') {
                    statusBadgeStyle = 'color: #dc2626; background: #fee2e2; padding: 4px 12px; border-radius: 12px; font-size: 0.82rem; font-weight: 700; display: inline-block;';
                }

                tr.innerHTML = `
                    <td><span class="date-pill">📅 ${item.date || '-'}</span></td>
                    <td style="color: #64748b; font-size: 0.85rem; font-weight: 600;">${item.timeOnly || '-'}</td>
                    <td><span class="session-pill">${item.session || '-'}</span></td>
                    <td style="font-weight: 700; color: #1e293b;">${item.name || '-'}</td>
                    <td style="color: #475569; font-weight: 600;">${item.class || '-'}</td>
                    <td><span style="${statusBadgeStyle}">${item.status || '-'}</span></td>
                    <td style="color: #64748b; font-size: 0.85rem; font-style: italic;">${item.notes || '-'}</td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (error) {
            console.error('Error fetching data:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #dc2626; padding: 2rem;">
                        ⚠️ Gagal terhubung ke database. Pastikan link Google Script benar.
                    </td>
                </tr>
            `;
        }
    }

    // Panggil saat halaman pertama dibuka
    loadLiveAttendanceData();

    // Fungsi Mengirim Data (POST)
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const record = {
                date: getFormattedDate(new Date()),
                timeOnly: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' WIB',
                session: document.getElementById('sessionName').value,
                name: document.getElementById('fullName').value.trim(),
                class: document.getElementById('memberId').value.trim(),
                status: document.getElementById('status').value,
                notes: document.getElementById('notes').value.trim()
            };

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>Mengirim... ⏳</span>';
            submitBtn.disabled = true;

            fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            }).then(() => {
                if (successToast) successToast.classList.remove('hidden');
                form.reset();
                
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;

                setTimeout(() => {
                    if (successToast) successToast.classList.add('hidden');
                }, 4000);

                // Tarik data ulang setelah jeda agar tabel otomatis ter-update
                setTimeout(() => {
                    loadLiveAttendanceData();
                }, 1500);

            }).catch(err => {
                console.error('Error:', err);
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            });
        });
    }
});