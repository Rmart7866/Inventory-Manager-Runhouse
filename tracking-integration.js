// Simple Tracking Integration - Just drag and drop CSVs

// Global functions for HTML onclick handlers
window.clearYesterday = function() {
    SimpleInventoryTracker.yesterdayInventory = null;
    document.getElementById('yesterday-file').value = '';
    document.getElementById('yesterday-uploaded').style.display = 'none';
    document.getElementById('yesterday-dropzone').style.display = 'block';
    document.getElementById('simple-comparison-report').style.display = 'none';
    document.getElementById('download-updated-section').style.display = 'none';
};

window.clearToday = function() {
    SimpleInventoryTracker.todayInventory = null;
    document.getElementById('today-file').value = '';
    document.getElementById('today-uploaded').style.display = 'none';
    document.getElementById('today-dropzone').style.display = 'block';
    document.getElementById('simple-comparison-report').style.display = 'none';
    document.getElementById('download-updated-section').style.display = 'none';
};

window.downloadUpdatedCSV = function() {
    const csvData = SimpleInventoryTracker.generateUpdatedCSV();
    
    if (!csvData) {
        alert('Error generating CSV. Please make sure both files are uploaded.');
        return;
    }
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `combined-inventory-${date}.csv`;
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

function setupSimpleTracking() {
    // Setup Yesterday dropzone
    const yesterdayDropzone = document.getElementById('yesterday-dropzone');
    const yesterdayInput = document.getElementById('yesterday-file');
    
    yesterdayDropzone.addEventListener('click', () => yesterdayInput.click());
    
    yesterdayDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        yesterdayDropzone.classList.add('dragover');
    });
    
    yesterdayDropzone.addEventListener('dragleave', () => {
        yesterdayDropzone.classList.remove('dragover');
    });
    
    yesterdayDropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        yesterdayDropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            await handleYesterdayFile(e.dataTransfer.files[0]);
        }
    });
    
    yesterdayInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            await handleYesterdayFile(e.target.files[0]);
        }
    });
    
    // Setup Today dropzone
    const todayDropzone = document.getElementById('today-dropzone');
    const todayInput = document.getElementById('today-file');
    
    todayDropzone.addEventListener('click', () => todayInput.click());
    
    todayDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        todayDropzone.classList.add('dragover');
    });
    
    todayDropzone.addEventListener('dragleave', () => {
        todayDropzone.classList.remove('dragover');
    });
    
    todayDropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        todayDropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            await handleTodayFile(e.dataTransfer.files[0]);
        }
    });
    
    todayInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            await handleTodayFile(e.target.files[0]);
        }
    });
}

async function handleYesterdayFile(file) {
    const result = await SimpleInventoryTracker.loadYesterdayCSV(file);
    
    if (result.success) {
        document.getElementById('yesterday-filename').textContent = file.name;
        document.getElementById('yesterday-info').textContent = `(${result.count} variants)`;
        document.getElementById('yesterday-uploaded').style.display = 'flex';
        document.getElementById('yesterday-dropzone').style.display = 'none';
        
        // If today is also loaded, show comparison
        if (SimpleInventoryTracker.todayInventory) {
            showSimpleComparison();
        }
    } else {
        alert('Error loading file: ' + result.error);
    }
}

async function handleTodayFile(file) {
    const result = await SimpleInventoryTracker.loadTodayCSV(file);
    
    if (result.success) {
        document.getElementById('today-filename').textContent = file.name;
        document.getElementById('today-info').textContent = `(${result.count} variants)`;
        document.getElementById('today-uploaded').style.display = 'flex';
        document.getElementById('today-dropzone').style.display = 'none';
        
        // If yesterday is also loaded, show comparison
        if (SimpleInventoryTracker.yesterdayInventory) {
            showSimpleComparison();
        }
    } else {
        alert('Error loading file: ' + result.error);
    }
}

function showSimpleComparison() {
    const report = SimpleInventoryTracker.getComparisonReport();
    const reportDiv = document.getElementById('simple-comparison-report');
    
    if (reportDiv) {
        reportDiv.textContent = report;
        reportDiv.style.display = 'block';
    }
    
    // Show download button
    document.getElementById('download-updated-section').style.display = 'block';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupSimpleTracking();
});
