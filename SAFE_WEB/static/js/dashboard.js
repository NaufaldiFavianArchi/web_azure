document.addEventListener('DOMContentLoaded', function() {
    // Konfigurasi
    const DEVICE_ID = 'sensor_002'; // Bisa dibuat dinamis nanti
    const API_LATEST_URL = `/api/v1/latest_data?device_id=${DEVICE_ID}`;
    const API_HISTORY_URL = `/api/v1/historical_data?device_id=${DEVICE_ID}`;
    const UPDATE_INTERVAL = 5000; // Update setiap 5 detik

    // Referensi Elemen DOM
    const totalLocationsElem = document.getElementById('total-locations');
    const tableBody = document.getElementById('sensor-table-body');
    const statusBadge = document.getElementById('connection-status');
    
    // Inisialisasi Grafik (Menggunakan Chart.js)
    let sensorChart;
    const ctx = document.getElementById('sensorChart').getContext('2d');

    function initChart() {
        sensorChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Suhu (°C)',
                    data: [],
                    borderColor: '#3b82f6', // Biru
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Kelembaban (%)',
                    data: [],
                    borderColor: '#10b981', // Hijau
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        display: false // Sembunyikan label waktu agar tidak penuh
                    },
                    y: {
                        beginAtZero: false
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }

    // Fungsi: Format Timestamp ke Waktu yang Bisa Dibaca
    function formatTime(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // Fungsi: Ambil Data Terbaru (Live)
    async function fetchLatestData() {
        try {
            const response = await fetch(API_LATEST_URL);
            const result = await response.json();

            if (result.status === 'success') {
                const data = result.data;
                
                // Update Status Koneksi
                if (statusBadge) {
                    statusBadge.textContent = 'Online';
                    statusBadge.className = 'px-2 py-1 text-xs font-bold text-white bg-green-500 rounded-full';
                }

                // Tambahkan Baris Baru ke Tabel (Paling Atas)
                const newRow = document.createElement('tr');
                newRow.className = "border-b hover:bg-gray-50 transition-colors";
                newRow.innerHTML = `
                    <td class="py-3 px-4">${formatTime(data.timestamp)}</td>
                    <td class="py-3 px-4 font-medium text-gray-900">${data.device_id}</td>
                    <td class="py-3 px-4 text-blue-600 font-bold">${data.temperature.toFixed(1)}°C</td>
                    <td class="py-3 px-4 text-green-600 font-bold">${data.humidity.toFixed(1)}%</td>
                    <td class="py-3 px-4">
                        ${data.is_anomaly 
                            ? '<span class="px-2 py-1 text-xs text-white bg-red-500 rounded-full">Bahaya</span>' 
                            : '<span class="px-2 py-1 text-xs text-white bg-green-500 rounded-full">Normal</span>'}
                    </td>
                `;

                // Hapus baris lama jika lebih dari 10, lalu tambahkan yang baru
                if (tableBody.rows.length >= 10) {
                    tableBody.deleteRow(-1);
                }
                tableBody.insertBefore(newRow, tableBody.firstChild);

                // Efek Kedip (Flash) untuk Indikator Update
                newRow.classList.add('bg-blue-50');
                setTimeout(() => newRow.classList.remove('bg-blue-50'), 500);

            }
        } catch (error) {
            console.error('Gagal mengambil data live:', error);
            if (statusBadge) {
                statusBadge.textContent = 'Offline';
                statusBadge.className = 'px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full';
            }
        }
    }

    // Fungsi: Ambil Data Historis (Grafik)
    async function fetchHistoricalData() {
        try {
            const response = await fetch(API_HISTORY_URL);
            const result = await response.json();

            if (result.status === 'success') {
                const history = result.data;
                
                // Siapkan array data untuk Chart.js
                const labels = history.map(item => formatTime(item.timestamp));
                const temps = history.map(item => item.temperature);
                const hums = history.map(item => item.humidity);

                // Update Grafik
                if (sensorChart) {
                    sensorChart.data.labels = labels;
                    sensorChart.data.datasets[0].data = temps;
                    sensorChart.data.datasets[1].data = hums;
                    sensorChart.update();
                }
            }
        } catch (error) {
            console.error('Gagal mengambil data historis:', error);
        }
    }

    // --- EKSEKUSI UTAMA ---
    initChart(); // 1. Buat Grafik Kosong
    fetchHistoricalData(); // 2. Isi Grafik dengan Data Lama
    fetchLatestData(); // 3. Ambil Data Terbaru Sekali

    // 4. Mulai Loop Update Otomatis
    setInterval(() => {
        fetchLatestData();     // Update Tabel & Status (Cepat)
        fetchHistoricalData(); // Update Grafik (Bisa lebih lambat jika mau)
    }, UPDATE_INTERVAL);

});