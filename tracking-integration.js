// Integration code for Inventory Tracking - HYBRID VERSION
// Automatically uses localStorage, with file upload/download as backup

// Setup snapshot file upload (BACKUP for cross-computer use)
function setupSnapshotUpload() {
    const dropZone = document.getElementById('snapshot-dropzone');
    const fileInput = document.getElementById('snapshot-file');
    
    if (!dropZone || !fileInput) return;
    
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            await handleSnapshotFile(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            await handleSnapshotFile(e.target.files[0]);
        }
    });
}

// Handle snapshot file upload (BACKUP METHOD)
async function handleSnapshotFile(file) {
    const result = await InventoryTracker.loadPreviousSnapshot(file);
    
    if (result.success) {
        document.getElementById('snapshot-filename').textContent = file.name;
        document.getElementById('snapshot-date').textContent = `(${result.date} - ${result.productCount} variants) 📁 FROM FILE`;
        document.getElementById('snapshot-uploaded').style.display = 'flex';
        document.getElementById('snapshot-dropzone').style.display = 'none';
        document.getElementById('localstorage-badge').style.display = 'none';
        
        // If we already have current inventory, show comparison
        if (InventoryTracker.currentInventoryData) {
            showComparisonReport();
        }
    } else {
        alert('Error loading snapshot file: ' + result.error);
    }
}

// Check localStorage on page load and show badge if data exists
function checkLocalStorageSnapshot() {
    const result = InventoryTracker.loadFromLocalStorage();
    
    if (result && result.success) {
        // Show badge indicating localStorage is being used
        const badge = document.getElementById('localstorage-badge');
        if (badge) {
            badge.style.display = 'block';
            badge.innerHTML = `✅ Auto-loaded from ${result.date} (${result.productCount} variants)`;
        }
        
        // Hide the upload dropzone since we have data
        document.getElementById('snapshot-dropzone').style.display = 'none';
        document.getElementById('snapshot-uploaded').style.display = 'none';
    }
}

// Clear snapshot
function clearSnapshot() {
    InventoryTracker.previousInventoryData = null;
    InventoryTracker.usingFileUpload = false;
    document.getElementById('snapshot-file').value = '';
    document.getElementById('snapshot-uploaded').style.display = 'none';
    document.getElementById('snapshot-dropzone').style.display = 'block';
    document.getElementById('comparison-report').style.display = 'none';
    document.getElementById('localstorage-badge').style.display = 'none';
    
    // Reload from localStorage
    checkLocalStorageSnapshot();
}

// Show comparison report
function showComparisonReport() {
    const report = InventoryTracker.getComparisonReport();
    const reportDiv = document.getElementById('comparison-report');
    
    if (reportDiv) {
        reportDiv.textContent = report;
        reportDiv.style.display = 'block';
    }
}

// Download today's snapshot (BACKUP for different computer)
function downloadTodaySnapshot() {
    const filename = InventoryTracker.downloadSnapshot();
    
    if (filename) {
        alert(`✅ Snapshot saved as ${filename}\n\n💡 TIP: This file is automatically saved to localStorage on this computer.\n\nOnly download if you need to use a different computer tomorrow!`);
    }
}

// Clear all localStorage history (useful for testing or fresh start)
function clearAllHistory() {
    if (confirm('⚠️ This will delete ALL saved inventory history from this computer.\n\nAre you sure?')) {
        localStorage.removeItem(InventoryTracker.STORAGE_KEY);
        InventoryTracker.clear();
        alert('✅ All history cleared!');
        location.reload();
    }
}

// MODIFIED: Update the existing downloadUnified function to include discontinued products
function downloadUnifiedWithTracking() {
    const allInventory = [];
    let selectedBrands = [];
    
    // Collect all selected brand inventories
    ['saucony', 'hoka', 'puma', 'newbalance', 'asics', 'brooks', 'on'].forEach(brand => {
        const checkbox = document.getElementById(`select-${brand}`);
        if (checkbox && checkbox.checked && BrandConverter.brands[brand].inventory.length > 0) {
            allInventory.push(...BrandConverter.brands[brand].inventory);
            selectedBrands.push(BrandConverter.getBrandDisplayName(brand));
        }
    });
    
    if (allInventory.length === 0) {
        alert('Please select at least one brand to download!');
        return;
    }
    
    // Create current snapshot
    InventoryTracker.createCurrentSnapshot(BrandConverter.brands);
    
    // Add discontinued products with 0 quantity if we have a previous snapshot
    const discontinuedRows = InventoryTracker.generateDiscontinuedInventoryRows();
    if (discontinuedRows.length > 0) {
        console.log(`Adding ${discontinuedRows.length} discontinued products with 0 quantity`);
        allInventory.push(...discontinuedRows);
    }
    
    // Generate CSV
    const inventoryHeaders = ['Handle', 'Title', '"Option1 Name"', '"Option1 Value"', '"Option2 Name"', '"Option2 Value"', 
                   '"Option3 Name"', '"Option3 Value"', 'SKU', 'Barcode', '"HS Code"', 'COO', 'Location', '"Bin name"', 
                   '"Incoming (not editable)"', '"Unavailable (not editable)"', '"Committed (not editable)"', 
                   '"Available (not editable)"', '"On hand (current)"', '"On hand (new)"'];
    
    const csvRows = [inventoryHeaders.join(',')];
    
    allInventory.forEach(row => {
        const csvRow = [
            row.Handle,
            `"${(row.Title || '').replace(/"/g, '""')}"`,
            row['Option1 Name'],
            row['Option1 Value'],
            row['Option2 Name'] || '',
            row['Option2 Value'] || '',
            row['Option3 Name'] || '',
            row['Option3 Value'] || '',
            row.SKU,
            row.Barcode || '',
            '', '',
            row.Location,
            '', '', '', '', '', '',
            row['On hand (new)']
        ];
        csvRows.push(csvRow.join(','));
    });
    
    const csvData = csvRows.join('\n');
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `unified-inventory-${date}.csv`;
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show the save snapshot button
    document.getElementById('tracking-actions').style.display = 'block';
    
    // Show comparison if we had a previous snapshot
    if (discontinuedRows.length > 0) {
        showComparisonReport();
    }
}

// MODIFIED: Update existing convertBrand function to update tracking
const originalConvertBrand = window.convertBrand;
window.convertBrand = async function(brand) {
    await originalConvertBrand(brand);
    
    // After conversion, create/update current snapshot and show comparison
    if (BrandConverter.brands[brand].inventory.length > 0) {
        // Automatically create and save snapshot
        InventoryTracker.createCurrentSnapshot(BrandConverter.brands);
        
        // Show comparison if we have previous data
        if (InventoryTracker.hasPreviousSnapshot()) {
            showComparisonReport();
        }
        
        // Show save snapshot button
        document.getElementById('tracking-actions').style.display = 'block';
    }
};

// Initialize tracking on page load
document.addEventListener('DOMContentLoaded', function() {
    setupSnapshotUpload();
    
    // Check for localStorage snapshot on load
    checkLocalStorageSnapshot();
    
    // Initialize the tracker
    InventoryTracker.init();
});
